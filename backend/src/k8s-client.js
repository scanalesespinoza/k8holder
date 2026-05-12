const k8s = require('@kubernetes/client-node');

class K8sClient {
    constructor() {
        this.kc = new k8s.KubeConfig();

        // Auto-detect if running in-cluster or local
        try {
            if (process.env.KUBERNETES_SERVICE_HOST) {
                console.log('🔵 Running in-cluster, loading config from ServiceAccount');
                this.kc.loadFromCluster();
            } else {
                console.log('🔵 Running locally, loading config from kubeconfig');
                this.kc.loadFromDefault();
            }
        } catch (error) {
            console.error('❌ Failed to load Kubernetes config:', error.message);
            throw error;
        }

        this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
        this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
        this.networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
        this.metricsApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
        this.metricsAvailable = false;

        // Namespace blacklist - excluye namespaces del sistema OpenShift
        // Configurable via NAMESPACE_BLACKLIST env var (comma-separated patterns)
        const blacklistEnv = process.env.NAMESPACE_BLACKLIST || 'openshift-*,kube-*,default,openshift';
        this.namespaceBlacklist = blacklistEnv.split(',').map(p => p.trim());
        console.log('🚫 Namespace blacklist:', this.namespaceBlacklist);

        // Check if metrics server is available
        this.checkMetricsServer();
    }

    /**
     * Check if namespace should be excluded based on blacklist
     */
    isNamespaceBlacklisted(namespace) {
        return this.namespaceBlacklist.some(pattern => {
            if (pattern.endsWith('*')) {
                // Wildcard match: "openshift-*" matches "openshift-anything"
                const prefix = pattern.slice(0, -1);
                return namespace.startsWith(prefix);
            } else {
                // Exact match
                return namespace === pattern;
            }
        });
    }

    /**
     * Check if Metrics Server is available
     */
    async checkMetricsServer() {
        try {
            await this.metricsApi.listClusterCustomObject('metrics.k8s.io', 'v1beta1', 'nodes');
            this.metricsAvailable = true;
            console.log('📊 Metrics Server is available');
        } catch (error) {
            this.metricsAvailable = false;
            console.warn('⚠️ Metrics Server not available, using simulated metrics');
        }
    }

    /**
     * Get all namespaces or filter by list
     */
    async getNamespaces(filter = []) {
        try {
            const response = await this.k8sApi.listNamespace();
            let namespaces = response.body.items.map(ns => ns.metadata.name);

            // Exclude blacklisted namespaces first
            namespaces = namespaces.filter(ns => !this.isNamespaceBlacklisted(ns));

            // Then apply additional filter if provided
            if (filter && filter.length > 0) {
                namespaces = namespaces.filter(ns => filter.includes(ns));
            }

            return namespaces;
        } catch (error) {
            console.error('❌ Error fetching namespaces:', error.message);
            throw error;
        }
    }

    /**
     * Get all pods in namespace(s)
     */
    async getPods(namespace = null) {
        try {
            let response;
            if (namespace) {
                response = await this.k8sApi.listNamespacedPod(namespace);
            } else {
                response = await this.k8sApi.listPodForAllNamespaces();
            }

            return response.body.items.map(pod => ({
                name: pod.metadata.name,
                namespace: pod.metadata.namespace,
                labels: pod.metadata.labels || {},
                phase: pod.status.phase,
                podIP: pod.status.podIP,
                nodeName: pod.spec.nodeName,
                containers: pod.spec.containers.map(c => ({
                    name: c.name,
                    image: c.image,
                    ports: c.ports || []
                })),
                conditions: pod.status.conditions || [],
                creationTimestamp: pod.metadata.creationTimestamp
            }));
        } catch (error) {
            console.error('❌ Error fetching pods:', error.message);
            throw error;
        }
    }

    /**
     * Get all services in namespace(s)
     */
    async getServices(namespace = null) {
        try {
            let response;
            if (namespace) {
                response = await this.k8sApi.listNamespacedService(namespace);
            } else {
                response = await this.k8sApi.listServiceForAllNamespaces();
            }

            return response.body.items.map(svc => ({
                name: svc.metadata.name,
                namespace: svc.metadata.namespace,
                labels: svc.metadata.labels || {},
                selector: svc.spec.selector || {},
                clusterIP: svc.spec.clusterIP,
                type: svc.spec.type,
                ports: (svc.spec.ports || []).map(p => ({
                    name: p.name,
                    port: p.port,
                    targetPort: p.targetPort,
                    protocol: p.protocol
                })),
                creationTimestamp: svc.metadata.creationTimestamp
            }));
        } catch (error) {
            console.error('❌ Error fetching services:', error.message);
            throw error;
        }
    }

    /**
     * Get all deployments in namespace(s)
     */
    async getDeployments(namespace = null) {
        try {
            let response;
            if (namespace) {
                response = await this.appsApi.listNamespacedDeployment(namespace);
            } else {
                response = await this.appsApi.listDeploymentForAllNamespaces();
            }

            return response.body.items.map(deploy => ({
                name: deploy.metadata.name,
                namespace: deploy.metadata.namespace,
                labels: deploy.metadata.labels || {},
                selector: deploy.spec.selector.matchLabels || {},
                replicas: deploy.spec.replicas,
                availableReplicas: deploy.status.availableReplicas || 0,
                readyReplicas: deploy.status.readyReplicas || 0,
                creationTimestamp: deploy.metadata.creationTimestamp
            }));
        } catch (error) {
            console.error('❌ Error fetching deployments:', error.message);
            throw error;
        }
    }

    /**
     * Get logs for a specific pod
     */
    async getPodLogs(namespace, podName, containerName = null, tailLines = 100) {
        try {
            const options = {
                follow: false,
                tailLines: tailLines,
                timestamps: true
            };

            if (containerName) {
                options.container = containerName;
            }

            const response = await this.k8sApi.readNamespacedPodLog(
                podName,
                namespace,
                containerName,
                false, // follow
                false, // insecureSkipTLSVerifyBackend
                undefined, // limitBytes
                false, // pretty
                false, // previous
                undefined, // sinceSeconds
                tailLines, // tailLines
                true // timestamps
            );

            return response.body;
        } catch (error) {
            console.error(`❌ Error fetching logs for ${namespace}/${podName}:`, error.message);
            throw error;
        }
    }

    /**
     * Build a topology graph of the cluster
     */
    async getTopology(namespaces = []) {
        try {
            console.log('🔍 Building cluster topology...');

            const [pods, services, deployments] = await Promise.all([
                this.getPods(),
                this.getServices(),
                this.getDeployments()
            ]);

            // Filter by namespaces and blacklist
            const filterByNs = (items) => {
                let filtered = items;

                // First, exclude blacklisted namespaces
                filtered = filtered.filter(item => !this.isNamespaceBlacklisted(item.namespace));

                // Then, if specific namespaces provided, include only those
                if (namespaces && namespaces.length > 0) {
                    filtered = filtered.filter(item => namespaces.includes(item.namespace));
                }

                return filtered;
            };

            const filteredPods = filterByNs(pods);
            const filteredServices = filterByNs(services);
            const filteredDeployments = filterByNs(deployments);

            // Build service-to-pod mapping
            const serviceToPods = {};
            filteredServices.forEach(svc => {
                const key = `${svc.namespace}/${svc.name}`;
                serviceToPods[key] = filteredPods.filter(pod => {
                    return this.matchesSelector(pod.labels, svc.selector);
                });
            });

            // Build deployment-to-pod mapping
            const deploymentToPods = {};
            filteredDeployments.forEach(deploy => {
                const key = `${deploy.namespace}/${deploy.name}`;
                deploymentToPods[key] = filteredPods.filter(pod => {
                    return this.matchesSelector(pod.labels, deploy.selector);
                });
            });

            return {
                pods: filteredPods,
                services: filteredServices,
                deployments: filteredDeployments,
                serviceToPods,
                deploymentToPods,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error building topology:', error.message);
            throw error;
        }
    }

    /**
     * Get pod metrics from Metrics Server
     */
    async getPodMetrics(namespace = null) {
        if (!this.metricsAvailable) {
            return null;
        }

        try {
            let response;
            if (namespace) {
                response = await this.metricsApi.listNamespacedCustomObject(
                    'metrics.k8s.io',
                    'v1beta1',
                    namespace,
                    'pods'
                );
            } else {
                response = await this.metricsApi.listClusterCustomObject(
                    'metrics.k8s.io',
                    'v1beta1',
                    'pods'
                );
            }

            return response.body.items;
        } catch (error) {
            console.error('❌ Error fetching pod metrics:', error.message);
            return null;
        }
    }

    /**
     * Get node metrics from Metrics Server
     */
    async getNodeMetrics() {
        if (!this.metricsAvailable) {
            return null;
        }

        try {
            const response = await this.metricsApi.listClusterCustomObject(
                'metrics.k8s.io',
                'v1beta1',
                'nodes'
            );

            return response.body.items;
        } catch (error) {
            console.error('❌ Error fetching node metrics:', error.message);
            return null;
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
     * Helper: Check if labels match selector
     */
    matchesSelector(labels, selector) {
        if (!selector || Object.keys(selector).length === 0) return false;

        return Object.entries(selector).every(([key, value]) => {
            return labels[key] === value;
        });
    }
}

module.exports = K8sClient;
