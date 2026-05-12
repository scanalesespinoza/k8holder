/**
 * Cluster Data Adapter
 * Transforma datos del backend al formato que necesita FactoryRenderer
 */

class ClusterDataAdapter {
    constructor(api) {
        this.api = api;
        this.rawTopology = null;
        this.rawResources = null;
        this.rawFlows = null;
        this.rawMetrics = null;
    }

    /**
     * Fetch all data from backend
     */
    async fetchAll() {
        try {
            const [topology, resources, flows, metrics] = await Promise.all([
                this.api.get('/api/topology'),
                this.api.get('/api/resources'),
                this.api.get('/api/flows'),
                this.api.get('/api/metrics')
            ]);

            this.rawTopology = topology;
            this.rawResources = resources;
            this.rawFlows = flows;
            this.rawMetrics = metrics;

            return this.buildClusterData();
        } catch (error) {
            console.error('Error fetching cluster data:', error);
            return this.buildEmptyClusterData();
        }
    }

    /**
     * Build unified cluster data structure
     */
    buildClusterData() {
        const clusterData = {
            nodes: this.buildNodes(),
            flows: this.buildFlows(),
            activeRequests: [],
            summary: this.buildSummary()
        };

        return clusterData;
    }

    /**
     * Build nodes with nested hierarchy
     */
    buildNodes() {
        if (!this.rawResources || !this.rawResources.nodes) {
            return [];
        }

        return this.rawResources.nodes.map(node => {
            // Get pods for this node
            const pods = this.getPodsForNode(node.name);

            return {
                name: node.name,
                type: 'node',
                ready: node.ready,
                schedulable: node.schedulable,
                roles: node.roles || [],

                capacity: {
                    cpu: node.capacity?.cpu || 0,
                    memory: node.capacity?.memory || 0,
                    pods: node.capacity?.pods || 0
                },

                allocatable: {
                    cpu: node.allocatable?.cpu || 0,
                    memory: node.allocatable?.memory || 0,
                    pods: node.allocatable?.pods || 0
                },

                utilization: {
                    cpu: node.utilization?.cpu || 0,
                    memory: node.utilization?.memory || 0
                },

                efficiency: {
                    cpu: node.efficiency?.cpu || 0,
                    memory: node.efficiency?.memory || 0
                },

                waste: {
                    cpu: node.waste?.cpu || 0,
                    memory: node.waste?.memory || 0,
                    cpuPercent: node.waste?.cpuPercent || 0,
                    memoryPercent: node.waste?.memoryPercent || 0
                },

                pods: pods
            };
        });
    }

    /**
     * Get pods for a specific node
     */
    getPodsForNode(nodeName) {
        if (!this.rawTopology || !this.rawTopology.pods) {
            return [];
        }

        return this.rawTopology.pods
            .filter(pod => pod.nodeName === nodeName)
            .map(pod => this.buildPod(pod));
    }

    /**
     * Build pod structure
     */
    buildPod(pod) {
        // Find deployment owner
        const deployment = this.findPodDeployment(pod);

        // Get pod metrics
        const metrics = this.getPodMetrics(pod.namespace, pod.name);

        // Find associated service
        const service = this.findPodService(pod);

        // Find routes for this pod
        const routes = this.findPodRoutes(pod, service);

        // Extract secrets from pod spec
        const secrets = this.extractPodSecrets(pod);

        // Extract configMaps from pod spec
        const configMaps = this.extractPodConfigMaps(pod);

        // Extract PVCs from pod spec
        const pvcs = this.extractPodPVCs(pod);

        return {
            name: pod.name,
            namespace: pod.namespace,
            type: 'pod',
            phase: pod.phase,
            deployment: deployment,

            containers: (pod.containers || []).map(container =>
                this.buildContainer(container, metrics)
            ),

            labels: pod.labels || {},
            nodeName: pod.nodeName,

            // Associated resources
            service: service,
            routes: routes,
            secrets: secrets,
            configMaps: configMaps,
            pvcs: pvcs
        };
    }

    /**
     * Find deployment owner of a pod
     */
    findPodDeployment(pod) {
        if (!this.rawTopology || !this.rawTopology.deploymentToPods) {
            return null;
        }

        // Check deployment -> pods mapping
        for (const [deploymentKey, pods] of Object.entries(this.rawTopology.deploymentToPods)) {
            if (pods.some(p => p.name === pod.name && p.namespace === pod.namespace)) {
                const [namespace, deploymentName] = deploymentKey.split('/');
                return deploymentName;
            }
        }

        return null;
    }

    /**
     * Build container structure
     */
    buildContainer(container, podMetrics) {
        // Extract container metrics from pod metrics
        let containerMetrics = null;
        if (podMetrics && podMetrics.cpu) {
            containerMetrics = {
                cpu: podMetrics.cpu.usage || 0,
                memory: podMetrics.memory.usage || 0
            };
        }

        // Parse resource requests/limits
        const requests = container.resources?.requests || {};
        const limits = container.resources?.limits || {};

        return {
            name: container.name,
            type: 'container',
            image: container.image,
            state: container.state || 'running',

            resources: {
                requests: {
                    cpu: this.parseCpu(requests.cpu),
                    memory: this.parseMemory(requests.memory)
                },
                limits: {
                    cpu: this.parseCpu(limits.cpu),
                    memory: this.parseMemory(limits.memory)
                }
            },

            usage: containerMetrics || {
                cpu: 0, // No fallback - only real metrics
                memory: 0
            }
        };
    }

    /**
     * Get pod metrics from metrics API
     */
    getPodMetrics(namespace, podName) {
        if (!this.rawMetrics || !this.rawMetrics.metrics) {
            return null;
        }

        const key = `${namespace}/${podName}`;
        return this.rawMetrics.metrics[key] || null;
    }

    /**
     * Build network flows
     */
    buildFlows() {
        if (!this.rawFlows || !this.rawFlows.flows) {
            return [];
        }

        return this.rawFlows.flows.map(flow => ({
            id: flow.id,
            source: {
                type: flow.source.type,
                namespace: flow.source.namespace,
                name: flow.source.name
            },
            target: {
                type: flow.target.type,
                namespace: flow.target.namespace,
                name: flow.target.name
            },
            metrics: {
                requestRate: flow.metrics?.requestRate || 0,
                errorRate: flow.metrics?.errorRate || 0,
                latencyP50: flow.metrics?.latencyP50 || 0,
                latencyP99: flow.metrics?.latencyP99 || 0
            },
            health: flow.health || 'healthy'
        }));
    }

    /**
     * Build cluster summary
     */
    buildSummary() {
        if (!this.rawResources) {
            return {
                nodeCount: 0,
                podCount: 0,
                flowCount: 0
            };
        }

        return {
            nodeCount: this.rawResources.nodes?.length || 0,
            podCount: (this.rawTopology?.pods || []).length,
            flowCount: (this.rawFlows?.flows || []).length,
            totalCapacity: {
                cpu: (this.rawResources.nodes || []).reduce((sum, n) => sum + (n.capacity?.cpu || 0), 0),
                memory: (this.rawResources.nodes || []).reduce((sum, n) => sum + (n.capacity?.memory || 0), 0)
            }
        };
    }

    /**
     * Build empty cluster data
     */
    buildEmptyClusterData() {
        return {
            nodes: [],
            flows: [],
            activeRequests: [],
            summary: {
                nodeCount: 0,
                podCount: 0,
                flowCount: 0
            }
        };
    }

    /**
     * Find service that selects this pod
     */
    findPodService(pod) {
        if (!this.rawTopology || !this.rawTopology.services) {
            return null;
        }

        // Find service that selects this pod based on labels
        const service = this.rawTopology.services.find(svc => {
            if (svc.namespace !== pod.namespace) return false;

            // Check if service selector matches pod labels
            if (!svc.selector || !pod.labels) return false;

            return Object.entries(svc.selector).every(([key, value]) =>
                pod.labels[key] === value
            );
        });

        if (!service) return null;

        return {
            name: service.name,
            type: service.type,
            clusterIP: service.clusterIP,
            ports: service.ports || []
        };
    }

    /**
     * Find routes for this pod's service
     */
    findPodRoutes(pod, service) {
        if (!service || !this.rawTopology || !this.rawTopology.routes) {
            return [];
        }

        // Find routes that point to this service
        return this.rawTopology.routes
            .filter(route =>
                route.namespace === pod.namespace &&
                route.serviceName === service.name
            )
            .map(route => ({
                name: route.name,
                host: route.host,
                path: route.path || '/'
            }));
    }

    /**
     * Extract secrets from pod spec
     */
    extractPodSecrets(pod) {
        const secrets = new Set();

        // Check volumes
        if (pod.volumes) {
            pod.volumes.forEach(vol => {
                if (vol.secret) {
                    secrets.add(vol.secret.secretName);
                }
            });
        }

        // Check envFrom
        if (pod.containers) {
            pod.containers.forEach(container => {
                if (container.envFrom) {
                    container.envFrom.forEach(source => {
                        if (source.secretRef) {
                            secrets.add(source.secretRef.name);
                        }
                    });
                }
            });
        }

        return Array.from(secrets);
    }

    /**
     * Extract configMaps from pod spec
     */
    extractPodConfigMaps(pod) {
        const configMaps = new Set();

        // Check volumes
        if (pod.volumes) {
            pod.volumes.forEach(vol => {
                if (vol.configMap) {
                    configMaps.add(vol.configMap.name);
                }
            });
        }

        // Check envFrom
        if (pod.containers) {
            pod.containers.forEach(container => {
                if (container.envFrom) {
                    container.envFrom.forEach(source => {
                        if (source.configMapRef) {
                            configMaps.add(source.configMapRef.name);
                        }
                    });
                }
            });
        }

        return Array.from(configMaps);
    }

    /**
     * Extract PVCs from pod spec
     */
    extractPodPVCs(pod) {
        const pvcs = [];

        // Check volumes
        if (pod.volumes) {
            pod.volumes.forEach(vol => {
                if (vol.persistentVolumeClaim) {
                    pvcs.push({
                        name: vol.persistentVolumeClaim.claimName,
                        size: 'N/A', // Would need to fetch PVC details
                        storageClass: 'N/A'
                    });
                }
            });
        }

        return pvcs;
    }

    /**
     * Parse CPU string to millicores
     */
    parseCpu(cpuString) {
        if (!cpuString) return 0;

        const str = cpuString.toString();

        if (str.endsWith('m')) {
            return parseInt(str);
        } else if (str.endsWith('n')) {
            return parseInt(str) / 1000000;
        } else {
            return parseFloat(str) * 1000;
        }
    }

    /**
     * Parse memory string to MB
     */
    parseMemory(memString) {
        if (!memString) return 0;

        const str = memString.toString();
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
            return parseInt(cleanStr) / (1024 * 1024);
        }
    }
}
