/**
 * Resource Analyzer for Resource Tetris
 * Analyzes node and pod resource usage for optimization
 */

class ResourceAnalyzer {
    constructor(k8sClient) {
        this.k8sClient = k8sClient;
        this.nodes = [];
        this.podsByNode = new Map();
        this.updateInterval = null;
    }

    /**
     * Start analyzing resources periodically
     */
    start(intervalMs = 10000) {
        console.log('🧩 Starting resource analysis...');

        // Initial analysis
        this.analyzeResources();

        // Periodic updates
        this.updateInterval = setInterval(() => {
            this.analyzeResources();
        }, intervalMs);
    }

    /**
     * Stop analyzing
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Analyze all resources
     */
    async analyzeResources() {
        try {
            // Get nodes
            const nodes = await this.k8sClient.k8sApi.listNode();

            // Get all pods
            const topology = await this.k8sClient.getTopology();

            // Get real metrics if available
            const podMetrics = await this.k8sClient.getPodMetrics();
            const nodeMetrics = await this.k8sClient.getNodeMetrics();

            // Create metrics lookup
            const podMetricsMap = new Map();
            if (podMetrics) {
                podMetrics.forEach(metric => {
                    const key = `${metric.metadata.namespace}/${metric.metadata.name}`;
                    podMetricsMap.set(key, metric);
                });
                console.log(`📊 Loaded ${podMetricsMap.size} pod metrics from Metrics Server`);
            } else {
                console.log('⚠️  No pod metrics available from Metrics Server');
            }

            const nodeMetricsMap = new Map();
            if (nodeMetrics) {
                nodeMetrics.forEach(metric => {
                    nodeMetricsMap.set(metric.metadata.name, metric);
                });
            }

            // Process nodes
            this.nodes = await Promise.all(nodes.body.items.map(node =>
                this.processNode(node, topology.pods, podMetricsMap, nodeMetricsMap)
            ));

            // Group pods by node
            this.podsByNode = this.groupPodsByNode(topology.pods, podMetricsMap);

            console.log(`🧩 Analyzed ${this.nodes.length} nodes with ${topology.pods.length} pods`);
        } catch (error) {
            console.error('❌ Error analyzing resources:', error.message);
        }
    }

    /**
     * Process a single node
     */
    async processNode(node, allPods, podMetricsMap = new Map(), nodeMetricsMap = new Map()) {
        const metadata = node.metadata;
        const status = node.status;

        // Get capacity and allocatable resources
        const capacity = status.capacity || {};
        const allocatable = status.allocatable || {};

        // Parse CPU (convert from 'm' to cores)
        const capacityCpu = this.parseCpu(capacity.cpu);
        const allocatableCpu = this.parseCpu(allocatable.cpu);

        // Parse Memory (convert to MB)
        const capacityMemory = this.parseMemory(capacity.memory);
        const allocatableMemory = this.parseMemory(allocatable.memory);

        // Get pods on this node
        const podsOnNode = allPods.filter(pod => pod.nodeName === metadata.name);

        // Calculate requests and limits
        const { totalRequests, totalLimits, actualUsage } = this.calculatePodResources(podsOnNode, podMetricsMap);

        // Calculate utilization
        const cpuUtilization = allocatableCpu > 0
            ? (totalRequests.cpu / allocatableCpu) * 100
            : 0;
        const memoryUtilization = allocatableMemory > 0
            ? (totalRequests.memory / allocatableMemory) * 100
            : 0;

        // Calculate waste (allocatable - actual usage)
        const cpuWaste = allocatableCpu - actualUsage.cpu;
        const memoryWaste = allocatableMemory - actualUsage.memory;

        // Calculate efficiency (actual usage vs allocatable - what's really being used)
        const cpuEfficiency = allocatableCpu > 0
            ? (actualUsage.cpu / allocatableCpu) * 100
            : 0;
        const memoryEfficiency = allocatableMemory > 0
            ? (actualUsage.memory / allocatableMemory) * 100
            : 0;

        // Determine node role
        const roles = this.getNodeRoles(node);

        return {
            name: metadata.name,
            roles,
            labels: metadata.labels || {},
            capacity: {
                cpu: capacityCpu,
                memory: capacityMemory,
                pods: parseInt(capacity.pods) || 110
            },
            allocatable: {
                cpu: allocatableCpu,
                memory: allocatableMemory,
                pods: parseInt(allocatable.pods) || 110
            },
            requests: totalRequests,
            limits: totalLimits,
            actualUsage,
            utilization: {
                cpu: cpuUtilization,
                memory: memoryUtilization
            },
            efficiency: {
                cpu: cpuEfficiency,
                memory: memoryEfficiency
            },
            waste: {
                cpu: cpuWaste,
                memory: memoryWaste,
                cpuPercent: allocatableCpu > 0 ? (cpuWaste / allocatableCpu) * 100 : 0,
                memoryPercent: allocatableMemory > 0 ? (memoryWaste / allocatableMemory) * 100 : 0
            },
            podCount: podsOnNode.length,
            pods: podsOnNode.map(p => ({ name: p.name, namespace: p.namespace })),
            conditions: status.conditions || [],
            ready: this.isNodeReady(node),
            schedulable: !node.spec.unschedulable
        };
    }

    /**
     * Calculate total resources for pods
     */
    calculatePodResources(pods, podMetricsMap = new Map()) {
        const totalRequests = { cpu: 0, memory: 0 };
        const totalLimits = { cpu: 0, memory: 0 };
        const actualUsage = { cpu: 0, memory: 0 };

        let podsWithMetrics = 0;

        pods.forEach(pod => {
            // Get real metrics if available
            const podKey = `${pod.namespace}/${pod.name}`;
            const podMetric = podMetricsMap.get(podKey);

            pod.containers.forEach(container => {
                // Requests
                if (container.resources?.requests) {
                    totalRequests.cpu += this.parseCpu(container.resources.requests.cpu || '0');
                    totalRequests.memory += this.parseMemory(container.resources.requests.memory || '0');
                }

                // Limits
                if (container.resources?.limits) {
                    totalLimits.cpu += this.parseCpu(container.resources.limits.cpu || '0');
                    totalLimits.memory += this.parseMemory(container.resources.limits.memory || '0');
                }
            });

            // Actual usage from metrics server or simulated
            if (podMetric && podMetric.containers) {
                podsWithMetrics++;
                podMetric.containers.forEach(containerMetric => {
                    // Parse real metrics (in nanocores and bytes)
                    const cpuNano = this.parseCpuMetric(containerMetric.usage.cpu);
                    const memoryBytes = this.parseMemoryMetric(containerMetric.usage.memory);

                    // Convert to our units (cores and MB)
                    actualUsage.cpu += cpuNano / 1000; // millicores to cores
                    actualUsage.memory += memoryBytes / (1024 * 1024); // bytes to MB
                });
            }
            // No fallback - only use real metrics from metrics server
        });

        if (pods.length > 0) {
            console.log(`  📊 Processed ${pods.length} pods, ${podsWithMetrics} have metrics (${(podsWithMetrics/pods.length*100).toFixed(1)}%)`);
        }

        return { totalRequests, totalLimits, actualUsage };
    }

    /**
     * Parse CPU string to cores
     */
    parseCpu(cpuString) {
        if (!cpuString) return 0;

        const str = cpuString.toString();

        if (str.endsWith('m')) {
            // Millicores
            return parseInt(str) / 1000;
        } else if (str.endsWith('n')) {
            // Nanocores (rare)
            return parseInt(str) / 1000000000;
        } else {
            // Cores
            return parseFloat(str);
        }
    }

    /**
     * Parse CPU metric from Metrics Server (returns millicores)
     */
    parseCpuMetric(cpuString) {
        if (!cpuString) return 0;

        const str = cpuString.toString();

        if (str.endsWith('n')) {
            // Nanocores
            return parseInt(str) / 1000000;
        } else if (str.endsWith('u')) {
            // Microcores
            return parseInt(str) / 1000;
        } else if (str.endsWith('m')) {
            // Millicores
            return parseInt(str);
        } else {
            // Cores
            return parseFloat(str) * 1000;
        }
    }

    /**
     * Parse memory metric from Metrics Server (returns bytes)
     */
    parseMemoryMetric(memString) {
        if (!memString) return 0;

        const str = memString.toString();

        // Remove 'i' suffix if present (Ki, Mi, Gi)
        const cleanStr = str.replace('i', '');

        if (cleanStr.endsWith('K')) {
            return parseInt(cleanStr) * 1024;
        } else if (cleanStr.endsWith('M')) {
            return parseInt(cleanStr) * 1024 * 1024;
        } else if (cleanStr.endsWith('G')) {
            return parseInt(cleanStr) * 1024 * 1024 * 1024;
        } else if (cleanStr.endsWith('T')) {
            return parseInt(cleanStr) * 1024 * 1024 * 1024 * 1024;
        } else {
            // Bytes
            return parseInt(cleanStr);
        }
    }

    /**
     * Parse memory string to MB
     */
    parseMemory(memString) {
        if (!memString) return 0;

        const str = memString.toString();

        // Remove 'i' suffix if present (Ki, Mi, Gi)
        const cleanStr = str.replace('i', '');

        if (cleanStr.endsWith('K')) {
            return parseInt(cleanStr) / 1024;
        } else if (cleanStr.endsWith('M')) {
            return parseInt(cleanStr);
        } else if (cleanStr.endsWith('G')) {
            return parseInt(cleanStr) * 1024;
        } else if (cleanStr.endsWith('T')) {
            return parseInt(cleanStr) * 1024 * 1024;
        } else {
            // Bytes
            return parseInt(cleanStr) / (1024 * 1024);
        }
    }

    /**
     * Get node roles
     */
    getNodeRoles(node) {
        const roles = [];
        const labels = node.metadata.labels || {};

        // Check common role labels
        Object.keys(labels).forEach(key => {
            if (key.includes('node-role.kubernetes.io/')) {
                const role = key.replace('node-role.kubernetes.io/', '');
                roles.push(role);
            }
        });

        return roles.length > 0 ? roles : ['worker'];
    }

    /**
     * Check if node is ready
     */
    isNodeReady(node) {
        const conditions = node.status.conditions || [];
        const readyCondition = conditions.find(c => c.type === 'Ready');
        return readyCondition?.status === 'True';
    }

    /**
     * Group pods by node
     */
    groupPodsByNode(pods, podMetricsMap = new Map()) {
        const grouped = new Map();

        pods.forEach(pod => {
            if (!pod.nodeName) return;

            if (!grouped.has(pod.nodeName)) {
                grouped.set(pod.nodeName, []);
            }

            const podKey = `${pod.namespace}/${pod.name}`;
            const podMetric = podMetricsMap.get(podKey);

            grouped.get(pod.nodeName).push({
                name: pod.name,
                namespace: pod.namespace,
                phase: pod.phase,
                requests: this.getPodRequests(pod),
                limits: this.getPodLimits(pod),
                actualUsage: this.getPodActualUsage(pod, podMetric)
            });
        });

        return grouped;
    }

    /**
     * Get pod requests
     */
    getPodRequests(pod) {
        const requests = { cpu: 0, memory: 0 };

        pod.containers.forEach(container => {
            if (container.resources?.requests) {
                requests.cpu += this.parseCpu(container.resources.requests.cpu || '0');
                requests.memory += this.parseMemory(container.resources.requests.memory || '0');
            }
        });

        return requests;
    }

    /**
     * Get pod limits
     */
    getPodLimits(pod) {
        const limits = { cpu: 0, memory: 0 };

        pod.containers.forEach(container => {
            if (container.resources?.limits) {
                limits.cpu += this.parseCpu(container.resources.limits.cpu || '0');
                limits.memory += this.parseMemory(container.resources.limits.memory || '0');
            }
        });

        return limits;
    }

    /**
     * Get pod actual usage from metrics or simulate
     */
    getPodActualUsage(pod, podMetric = null) {
        const usage = { cpu: 0, memory: 0 };

        if (podMetric && podMetric.containers) {
            // Use real metrics
            podMetric.containers.forEach(containerMetric => {
                const cpuNano = this.parseCpuMetric(containerMetric.usage.cpu);
                const memoryBytes = this.parseMemoryMetric(containerMetric.usage.memory);

                // Convert to our units
                usage.cpu += cpuNano / 1000; // millicores to cores
                usage.memory += memoryBytes / (1024 * 1024); // bytes to MB
            });
        }
        // No fallback - only use real metrics from metrics server

        return usage;
    }

    /**
     * Get all nodes
     */
    getNodes() {
        return this.nodes;
    }

    /**
     * Get pods by node
     */
    getPodsByNode(nodeName) {
        return this.podsByNode.get(nodeName) || [];
    }

    /**
     * Get cluster summary
     */
    getSummary() {
        const totalCapacity = { cpu: 0, memory: 0 };
        const totalAllocatable = { cpu: 0, memory: 0 };
        const totalRequests = { cpu: 0, memory: 0 };
        const totalActualUsage = { cpu: 0, memory: 0 };
        const totalWaste = { cpu: 0, memory: 0 };

        this.nodes.forEach(node => {
            totalCapacity.cpu += node.capacity.cpu;
            totalCapacity.memory += node.capacity.memory;
            totalAllocatable.cpu += node.allocatable.cpu;
            totalAllocatable.memory += node.allocatable.memory;
            totalRequests.cpu += node.requests.cpu;
            totalRequests.memory += node.requests.memory;
            totalActualUsage.cpu += node.actualUsage.cpu;
            totalActualUsage.memory += node.actualUsage.memory;
            totalWaste.cpu += node.waste.cpu;
            totalWaste.memory += node.waste.memory;
        });

        const utilizationCpu = totalAllocatable.cpu > 0
            ? (totalRequests.cpu / totalAllocatable.cpu) * 100
            : 0;
        const utilizationMemory = totalAllocatable.memory > 0
            ? (totalRequests.memory / totalAllocatable.memory) * 100
            : 0;

        const efficiencyCpu = totalAllocatable.cpu > 0
            ? (totalActualUsage.cpu / totalAllocatable.cpu) * 100
            : 0;
        const efficiencyMemory = totalAllocatable.memory > 0
            ? (totalActualUsage.memory / totalAllocatable.memory) * 100
            : 0;

        return {
            nodeCount: this.nodes.length,
            capacity: totalCapacity,
            allocatable: totalAllocatable,
            requests: totalRequests,
            actualUsage: totalActualUsage,
            waste: totalWaste,
            utilization: {
                cpu: utilizationCpu,
                memory: utilizationMemory
            },
            efficiency: {
                cpu: efficiencyCpu,
                memory: efficiencyMemory
            },
            wastePercent: {
                cpu: totalAllocatable.cpu > 0 ? (totalWaste.cpu / totalAllocatable.cpu) * 100 : 0,
                memory: totalAllocatable.memory > 0 ? (totalWaste.memory / totalAllocatable.memory) * 100 : 0
            }
        };
    }

    /**
     * Generate optimization suggestions
     */
    generateOptimizations() {
        const suggestions = [];

        // Find underutilized nodes (< 40% utilization)
        const underutilizedNodes = this.nodes.filter(node =>
            node.utilization.cpu < 40 && node.utilization.memory < 40 && node.schedulable
        );

        if (underutilizedNodes.length > 1) {
            suggestions.push({
                type: 'consolidation',
                priority: 'high',
                title: `Consolidate ${underutilizedNodes.length} underutilized nodes`,
                description: `${underutilizedNodes.length} nodes are running at <40% utilization. Consolidating pods could free up nodes.`,
                potentialSavings: this.calculateConsolidationSavings(underutilizedNodes),
                affectedNodes: underutilizedNodes.map(n => n.name)
            });
        }

        // Find overcommitted pods (limits >> requests)
        this.nodes.forEach(node => {
            const pods = this.getPodsByNode(node.name);

            pods.forEach(pod => {
                if (pod.limits.cpu > pod.requests.cpu * 2 ||
                    pod.limits.memory > pod.requests.memory * 2) {
                    suggestions.push({
                        type: 'right-sizing',
                        priority: 'medium',
                        title: `Right-size ${pod.namespace}/${pod.name}`,
                        description: `Pod has limits 2x+ higher than requests. Consider adjusting.`,
                        currentRequests: pod.requests,
                        currentLimits: pod.limits,
                        recommendedRequests: pod.actualUsage,
                        recommendedLimits: {
                            cpu: pod.actualUsage.cpu * 1.5,
                            memory: pod.actualUsage.memory * 1.3
                        }
                    });
                }
            });
        });

        // Find nodes with high waste
        const wastefulNodes = this.nodes.filter(node =>
            node.waste.cpuPercent > 50 || node.waste.memoryPercent > 50
        );

        wastefulNodes.forEach(node => {
            suggestions.push({
                type: 'waste-reduction',
                priority: 'medium',
                title: `Reduce waste on ${node.name}`,
                description: `Node has ${node.waste.cpuPercent.toFixed(1)}% CPU and ${node.waste.memoryPercent.toFixed(1)}% memory waste.`,
                node: node.name,
                waste: node.waste
            });
        });

        return suggestions;
    }

    /**
     * Calculate potential savings from consolidation
     */
    calculateConsolidationSavings(nodes) {
        // Assume $0.05/core/hour and $0.01/GB/hour (rough AWS pricing)
        const cpuCostPerCorePerHour = 0.05;
        const memoryCostPerGBPerHour = 0.01;

        const totalCpu = nodes.reduce((sum, n) => sum + n.allocatable.cpu, 0);
        const totalMemory = nodes.reduce((sum, n) => sum + n.allocatable.memory / 1024, 0); // GB

        const hourlySavings = (totalCpu * cpuCostPerCorePerHour) + (totalMemory * memoryCostPerGBPerHour);
        const monthlySavings = hourlySavings * 730; // Average hours per month

        return {
            hourly: hourlySavings.toFixed(2),
            daily: (hourlySavings * 24).toFixed(2),
            monthly: monthlySavings.toFixed(2),
            yearly: (monthlySavings * 12).toFixed(2)
        };
    }
}

module.exports = ResourceAnalyzer;
