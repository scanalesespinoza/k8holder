/**
 * Prometheus Metrics Service
 *
 * Exposes application-specific metrics for OpenShift monitoring stack.
 * Follows Red Hat best practices for custom application metrics.
 *
 * Integration: OpenShift Prometheus Operator automatically discovers
 * metrics via ServiceMonitor CRD.
 */

const promClient = require('prom-client');

class PrometheusService {
    constructor() {
        // Create a Registry for custom metrics
        this.register = new promClient.Registry();

        // Add default Node.js metrics (memory, CPU, event loop, etc.)
        promClient.collectDefaultMetrics({
            register: this.register,
            prefix: 'k8holder_nodejs_',
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
        });

        // Initialize custom metrics
        this.initializeMetrics();
    }

    initializeMetrics() {
        // 1. HTTP Request Counter
        this.httpRequestsTotal = new promClient.Counter({
            name: 'k8holder_http_requests_total',
            help: 'Total HTTP requests by endpoint, method, and status code',
            labelNames: ['endpoint', 'method', 'status_code'],
            registers: [this.register]
        });

        // 2. HTTP Request Duration
        this.httpRequestDuration = new promClient.Histogram({
            name: 'k8holder_http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['endpoint', 'method'],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // 10ms to 5s
            registers: [this.register]
        });

        // 3. API Errors Counter
        this.apiErrorsTotal = new promClient.Counter({
            name: 'k8holder_api_errors_total',
            help: 'Total API errors by endpoint and error type',
            labelNames: ['endpoint', 'error_type'],
            registers: [this.register]
        });

        // 4. Nodes Monitored Gauge
        this.nodesMonitored = new promClient.Gauge({
            name: 'k8holder_nodes_monitored_total',
            help: 'Number of Kubernetes nodes currently being monitored',
            registers: [this.register]
        });

        // 5. Pods Monitored Gauge
        this.podsMonitored = new promClient.Gauge({
            name: 'k8holder_pods_monitored_total',
            help: 'Number of Kubernetes pods currently being monitored',
            labelNames: ['namespace'],
            registers: [this.register]
        });

        // 6. AI Requests Counter
        this.aiRequestsTotal = new promClient.Counter({
            name: 'k8holder_ai_requests_total',
            help: 'Total AI requests to Red Hat MaaS',
            labelNames: ['type', 'status'], // type: diagnostic|optimization|report
            registers: [this.register]
        });

        // 7. AI Request Duration
        this.aiRequestDuration = new promClient.Histogram({
            name: 'k8holder_ai_request_duration_seconds',
            help: 'AI request duration in seconds',
            labelNames: ['type'],
            buckets: [0.5, 1, 2, 5, 10, 30], // 500ms to 30s
            registers: [this.register]
        });

        // 8. WebSocket Connections Gauge
        this.websocketConnections = new promClient.Gauge({
            name: 'k8holder_websocket_connections_active',
            help: 'Number of active WebSocket connections',
            registers: [this.register]
        });

        // 9. Kubernetes API Calls Counter
        this.k8sApiCallsTotal = new promClient.Counter({
            name: 'k8holder_k8s_api_calls_total',
            help: 'Total Kubernetes API calls by resource type and status',
            labelNames: ['resource_type', 'status'],
            registers: [this.register]
        });

        // 10. Cache Hit Ratio
        this.cacheHitsTotal = new promClient.Counter({
            name: 'k8holder_cache_hits_total',
            help: 'Total cache hits',
            labelNames: ['cache_key'],
            registers: [this.register]
        });

        this.cacheMissesTotal = new promClient.Counter({
            name: 'k8holder_cache_misses_total',
            help: 'Total cache misses',
            labelNames: ['cache_key'],
            registers: [this.register]
        });
    }

    /**
     * HTTP Request Middleware - Automatic metrics collection
     */
    requestMetricsMiddleware() {
        return (req, res, next) => {
            const start = Date.now();
            const endpoint = this.normalizeEndpoint(req.path);

            // Capture response
            res.on('finish', () => {
                const duration = (Date.now() - start) / 1000; // Convert to seconds
                const statusCode = res.statusCode.toString();

                // Increment counter
                this.httpRequestsTotal.inc({
                    endpoint,
                    method: req.method,
                    status_code: statusCode
                });

                // Record duration
                this.httpRequestDuration.observe({
                    endpoint,
                    method: req.method
                }, duration);
            });

            next();
        };
    }

    /**
     * Normalize endpoint for consistent labeling
     * /api/pods/default/my-pod/logs -> /api/pods/:namespace/:pod/logs
     */
    normalizeEndpoint(path) {
        return path
            .replace(/\/[a-f0-9-]{36}/g, '/:id') // UUIDs
            .replace(/\/[a-f0-9]{8,}/g, '/:hash') // Hashes
            .replace(/\/\d+/g, '/:id') // Numbers
            .replace(/\/[a-z0-9-]+\/[a-z0-9-]+\/logs$/, '/:namespace/:pod/logs');
    }

    /**
     * Track API errors
     */
    recordError(endpoint, errorType) {
        this.apiErrorsTotal.inc({
            endpoint: this.normalizeEndpoint(endpoint),
            error_type: errorType
        });
    }

    /**
     * Update cluster monitoring metrics
     */
    updateClusterMetrics(nodes, pods) {
        // Update node count
        if (nodes && Array.isArray(nodes)) {
            this.nodesMonitored.set(nodes.length);
        }

        // Update pod count by namespace
        if (pods && Array.isArray(pods)) {
            const podsByNamespace = pods.reduce((acc, pod) => {
                acc[pod.namespace] = (acc[pod.namespace] || 0) + 1;
                return acc;
            }, {});

            // Reset and set new values
            this.podsMonitored.reset();
            Object.entries(podsByNamespace).forEach(([namespace, count]) => {
                this.podsMonitored.set({ namespace }, count);
            });
        }
    }

    /**
     * Track AI requests
     */
    recordAIRequest(type, status, duration) {
        this.aiRequestsTotal.inc({ type, status });
        if (duration !== undefined) {
            this.aiRequestDuration.observe({ type }, duration);
        }
    }

    /**
     * Track WebSocket connections
     */
    setWebSocketConnections(count) {
        this.websocketConnections.set(count);
    }

    /**
     * Track Kubernetes API calls
     */
    recordK8sApiCall(resourceType, status) {
        this.k8sApiCallsTotal.inc({
            resource_type: resourceType,
            status: status
        });
    }

    /**
     * Track cache hits/misses
     */
    recordCacheHit(cacheKey) {
        this.cacheHitsTotal.inc({ cache_key: cacheKey });
    }

    recordCacheMiss(cacheKey) {
        this.cacheMissesTotal.inc({ cache_key: cacheKey });
    }

    /**
     * Get metrics in Prometheus format
     */
    async getMetrics() {
        return this.register.metrics();
    }

    /**
     * Get content type for metrics endpoint
     */
    getContentType() {
        return this.register.contentType;
    }
}

// Singleton instance
const prometheusService = new PrometheusService();

module.exports = prometheusService;
