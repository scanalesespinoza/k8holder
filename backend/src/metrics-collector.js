/**
 * Metrics Collector for Network Flow Visualization
 * Collects network metrics from Kubernetes and builds traffic flow data
 */

class MetricsCollector {
    constructor(k8sClient) {
        this.k8sClient = k8sClient;
        this.flows = new Map(); // Store active flows between pods
        this.metrics = new Map(); // Store metrics per pod
        this.updateInterval = null;
    }

    /**
     * Start collecting metrics periodically
     */
    start(intervalMs = 5000) {
        console.log('📊 Starting metrics collection...');

        // Initial collection
        this.collectMetrics();

        // Periodic updates
        this.updateInterval = setInterval(() => {
            this.collectMetrics();
        }, intervalMs);
    }

    /**
     * Stop collecting metrics
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Collect all metrics
     */
    async collectMetrics() {
        try {
            // Get topology first
            const topology = await this.k8sClient.getTopology();

            // Get real metrics from Metrics Server
            const podMetrics = await this.k8sClient.getPodMetrics();

            // Build network flows from services
            await this.buildNetworkFlows(topology);

            // Collect pod metrics (CPU, RAM, Network I/O)
            await this.collectPodMetrics(topology, podMetrics);

            // Infer traffic from logs (fallback if no Service Mesh)
            await this.inferTrafficFromLogs(topology);

        } catch (error) {
            console.error('❌ Error collecting metrics:', error.message);
        }
    }

    /**
     * Build network flows from service topology
     */
    async buildNetworkFlows(topology) {
        const flows = [];

        // Iterate through services and their endpoints
        for (const [serviceKey, pods] of Object.entries(topology.serviceToPods)) {
            if (pods.length === 0) continue;

            const [namespace, serviceName] = serviceKey.split('/');
            const service = topology.services.find(s =>
                s.namespace === namespace && s.name === serviceName
            );

            if (!service) continue;

            // For each pod behind this service
            for (const pod of pods) {
                // Create a flow from service to pod
                const flowId = `${serviceKey}->${namespace}/${pod.name}`;

                flows.push({
                    id: flowId,
                    source: {
                        type: 'service',
                        namespace,
                        name: serviceName,
                        clusterIP: service.clusterIP
                    },
                    target: {
                        type: 'pod',
                        namespace: pod.namespace,
                        name: pod.name,
                        podIP: pod.podIP
                    },
                    metrics: {
                        requestRate: 0, // Real metrics require service mesh or prometheus
                        errorRate: 0,
                        latencyP50: 0,
                        latencyP99: 0
                    },
                    health: 'healthy', // 'healthy' | 'warning' | 'error'
                    timestamp: new Date().toISOString()
                });
            }

            // TODO: Detect pod-to-pod flows from logs or Service Mesh
        }

        // Store flows
        flows.forEach(flow => {
            this.flows.set(flow.id, flow);
        });

        return flows;
    }

    /**
     * Collect pod-level metrics
     */
    async collectPodMetrics(topology, podMetrics = null) {
        // Create metrics lookup
        const metricsMap = new Map();
        if (podMetrics) {
            podMetrics.forEach(metric => {
                const key = `${metric.metadata.namespace}/${metric.metadata.name}`;
                metricsMap.set(key, metric);
            });
        }

        for (const pod of topology.pods) {
            const podKey = `${pod.namespace}/${pod.name}`;
            const podMetric = metricsMap.get(podKey);

            let cpuUsage, memoryUsage;

            if (podMetric && podMetric.containers) {
                // Use real metrics
                let totalCpuNano = 0;
                let totalMemoryBytes = 0;

                podMetric.containers.forEach(containerMetric => {
                    totalCpuNano += this.parseCpuMetric(containerMetric.usage.cpu);
                    totalMemoryBytes += this.parseMemoryMetric(containerMetric.usage.memory);
                });

                // Convert to MB and percentage
                cpuUsage = totalCpuNano / 1000; // millicores
                memoryUsage = totalMemoryBytes / (1024 * 1024); // MB
            } else {
                // No metrics available - skip pod metrics
                continue;
            }

            this.metrics.set(podKey, {
                cpu: {
                    usage: cpuUsage,
                    requests: pod.containers[0]?.resources?.requests?.cpu || '100m',
                    limits: pod.containers[0]?.resources?.limits?.cpu || '500m'
                },
                memory: {
                    usage: memoryUsage,
                    requests: pod.containers[0]?.resources?.requests?.memory || '256Mi',
                    limits: pod.containers[0]?.resources?.limits?.memory || '512Mi'
                },
                network: {
                    // Network metrics not available in metrics-server - require prometheus/service mesh
                    rxBytes: 0,
                    txBytes: 0,
                    rxPackets: 0,
                    txPackets: 0
                },
                timestamp: new Date().toISOString(),
                realMetrics: !!podMetric // Flag to indicate if using real metrics
            });
        }
    }

    /**
     * Infer traffic flows from logs (when no Service Mesh available)
     */
    async inferTrafficFromLogs(topology) {
        // Parse recent logs for HTTP calls between services
        // This is a basic implementation - could be enhanced with log parsing

        // Example: Look for logs like:
        // "Calling service-b at http://service-b:8080/api"
        // "[req-123] Request to http://database:5432"

        // For now, we'll skip this and rely on service topology
        // In production, you'd parse logs here to detect actual traffic
    }

    /**
     * Get all current flows
     */
    getFlows() {
        return Array.from(this.flows.values());
    }

    /**
     * Get flows for a specific namespace
     */
    getFlowsByNamespace(namespace) {
        return this.getFlows().filter(flow =>
            flow.source.namespace === namespace || flow.target.namespace === namespace
        );
    }

    /**
     * Get metrics for a specific pod
     */
    getPodMetrics(namespace, podName) {
        return this.metrics.get(`${namespace}/${podName}`);
    }

    /**
     * Get all metrics
     */
    getAllMetrics() {
        const result = {};
        for (const [key, value] of this.metrics.entries()) {
            result[key] = value;
        }
        return result;
    }

    /**
     * Calculate flow health based on metrics
     */
    calculateFlowHealth(flow) {
        const { errorRate, latencyP99 } = flow.metrics;

        if (errorRate > 10 || latencyP99 > 500) {
            return 'error';
        } else if (errorRate > 5 || latencyP99 > 200) {
            return 'warning';
        }
        return 'healthy';
    }

    /**
     * Update flow health
     */
    updateFlowHealth() {
        for (const flow of this.flows.values()) {
            flow.health = this.calculateFlowHealth(flow);
        }
    }

    /**
     * Parse CPU metric to millicores
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
     * Parse memory metric to bytes
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
     * Get random metric (for simulation)
     * TODO: Replace with actual Prometheus queries
     */
    getRandomMetric(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Get network flow summary
     */
    getSummary() {
        const flows = this.getFlows();

        return {
            totalFlows: flows.length,
            healthyFlows: flows.filter(f => f.health === 'healthy').length,
            warningFlows: flows.filter(f => f.health === 'warning').length,
            errorFlows: flows.filter(f => f.health === 'error').length,
            totalRequestRate: flows.reduce((sum, f) => sum + f.metrics.requestRate, 0),
            avgLatency: flows.length > 0
                ? flows.reduce((sum, f) => sum + f.metrics.latencyP50, 0) / flows.length
                : 0,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = MetricsCollector;
