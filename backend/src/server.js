require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const NodeCache = require('node-cache');

const K8sClient = require('./k8s-client');
const LogParser = require('./log-parser');
const MetricsCollector = require('./metrics-collector');
const ResourceAnalyzer = require('./resource-analyzer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 8080;
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 30;
const CORRELATION_HEADER = process.env.CORRELATION_HEADER || 'x-request-id';
const NAMESPACES = process.env.NAMESPACES ? process.env.NAMESPACES.split(',') : [];

// Initialize
const k8sClient = new K8sClient();
const logParser = new LogParser(CORRELATION_HEADER);
const metricsCollector = new MetricsCollector(k8sClient);
const resourceAnalyzer = new ResourceAnalyzer(k8sClient);
const cache = new NodeCache({ stdTTL: CACHE_TTL });

// Start metrics collection
metricsCollector.start(5000); // Update every 5 seconds

// Start resource analysis
resourceAnalyzer.start(10000); // Update every 10 seconds

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public/dist')));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        metricsServer: k8sClient.metricsAvailable
    });
});

// API Routes

/**
 * GET /api/topology
 * Returns the current cluster topology
 */
app.get('/api/topology', async (req, res) => {
    try {
        const cacheKey = 'topology';
        let topology = cache.get(cacheKey);

        if (!topology) {
            console.log('📊 Fetching fresh topology data...');
            topology = await k8sClient.getTopology(NAMESPACES);
            cache.set(cacheKey, topology);
        }

        res.json(topology);
    } catch (error) {
        console.error('❌ Error in /api/topology:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/namespaces
 * Returns list of namespaces
 */
app.get('/api/namespaces', async (req, res) => {
    try {
        const namespaces = await k8sClient.getNamespaces(NAMESPACES);
        res.json({ namespaces });
    } catch (error) {
        console.error('❌ Error in /api/namespaces:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/pods/:namespace/:podName/logs
 * Returns logs for a specific pod
 */
app.get('/api/pods/:namespace/:podName/logs', async (req, res) => {
    try {
        const { namespace, podName } = req.params;
        const { container, tailLines = 100 } = req.query;

        console.log(`📜 Fetching logs for ${namespace}/${podName}`);

        const logs = await k8sClient.getPodLogs(
            namespace,
            podName,
            container || null,
            parseInt(tailLines)
        );

        // Parse logs for correlation IDs
        const entries = logParser.parsePodLogs(logs, podName, namespace);

        res.json({
            pod: podName,
            namespace,
            container,
            rawLogs: logs,
            parsedEntries: entries,
            correlationIds: [...new Set(entries.map(e => e.correlationId))]
        });
    } catch (error) {
        console.error('❌ Error fetching logs:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/traces
 * Returns all correlation IDs found in logs
 */
app.get('/api/traces', async (req, res) => {
    try {
        const correlationIds = logParser.getCorrelationIds();
        res.json({ correlationIds, count: correlationIds.length });
    } catch (error) {
        console.error('❌ Error in /api/traces:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/traces/:correlationId
 * Returns the trace for a specific correlation ID
 */
app.get('/api/traces/:correlationId', async (req, res) => {
    try {
        const { correlationId } = req.params;
        const trace = logParser.buildTrace(correlationId);

        if (!trace) {
            return res.status(404).json({
                error: 'Trace not found',
                correlationId
            });
        }

        res.json(trace);
    } catch (error) {
        console.error('❌ Error in /api/traces/:id:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/scan-logs
 * Scans logs across all pods to find correlation IDs
 */
app.post('/api/scan-logs', async (req, res) => {
    try {
        const { tailLines = 100 } = req.body;

        console.log('🔍 Scanning logs across all pods...');

        const topology = await k8sClient.getTopology(NAMESPACES);
        const scanResults = [];

        // Scan logs for each pod
        for (const pod of topology.pods) {
            try {
                console.log(`  📜 Scanning ${pod.namespace}/${pod.name}`);

                const logs = await k8sClient.getPodLogs(
                    pod.namespace,
                    pod.name,
                    null,
                    tailLines
                );

                const entries = logParser.parsePodLogs(logs, pod.name, pod.namespace);

                scanResults.push({
                    pod: pod.name,
                    namespace: pod.namespace,
                    entriesFound: entries.length,
                    correlationIds: [...new Set(entries.map(e => e.correlationId))]
                });
            } catch (error) {
                console.error(`  ❌ Failed to scan ${pod.namespace}/${pod.name}:`, error.message);
            }
        }

        const allCorrelationIds = logParser.getCorrelationIds();

        res.json({
            scannedPods: scanResults.length,
            totalCorrelationIds: allCorrelationIds.length,
            correlationIds: allCorrelationIds,
            scanResults
        });
    } catch (error) {
        console.error('❌ Error in /api/scan-logs:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/flows
 * Returns all network flows
 */
app.get('/api/flows', async (req, res) => {
    try {
        const { namespace } = req.query;

        let flows;
        if (namespace) {
            flows = metricsCollector.getFlowsByNamespace(namespace);
        } else {
            flows = metricsCollector.getFlows();
        }

        res.json({
            flows,
            count: flows.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error in /api/flows:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/flows/summary
 * Returns network flow summary
 */
app.get('/api/flows/summary', async (req, res) => {
    try {
        const summary = metricsCollector.getSummary();
        res.json(summary);
    } catch (error) {
        console.error('❌ Error in /api/flows/summary:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/metrics
 * Returns pod metrics
 */
app.get('/api/metrics', async (req, res) => {
    try {
        const { namespace, pod } = req.query;

        if (namespace && pod) {
            const metrics = metricsCollector.getPodMetrics(namespace, pod);
            if (!metrics) {
                return res.status(404).json({
                    error: 'Metrics not found for pod',
                    namespace,
                    pod
                });
            }
            res.json(metrics);
        } else {
            const allMetrics = metricsCollector.getAllMetrics();
            res.json({
                metrics: allMetrics,
                count: Object.keys(allMetrics).length,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Error in /api/metrics:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/resources
 * Returns all node resources
 */
app.get('/api/resources', async (req, res) => {
    try {
        const nodes = resourceAnalyzer.getNodes();
        res.json({
            nodes,
            count: nodes.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error in /api/resources:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/resources/summary
 * Returns cluster resource summary
 */
app.get('/api/resources/summary', async (req, res) => {
    try {
        const summary = resourceAnalyzer.getSummary();
        res.json(summary);
    } catch (error) {
        console.error('❌ Error in /api/resources/summary:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/optimizations
 * Returns optimization suggestions
 */
app.get('/api/optimizations', async (req, res) => {
    try {
        const optimizations = resourceAnalyzer.generateOptimizations();
        res.json({
            suggestions: optimizations,
            count: optimizations.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error in /api/optimizations:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// WebSocket for real-time updates
wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket connection');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 WebSocket message:', data.type);

            switch (data.type) {
                case 'get-topology':
                    const topology = await k8sClient.getTopology(NAMESPACES);
                    ws.send(JSON.stringify({
                        type: 'topology',
                        data: topology
                    }));
                    break;

                case 'get-trace':
                    const trace = logParser.buildTrace(data.correlationId);
                    ws.send(JSON.stringify({
                        type: 'trace',
                        data: trace
                    }));
                    break;

                case 'scan-logs':
                    // Trigger log scan (long operation, send progress updates)
                    ws.send(JSON.stringify({
                        type: 'scan-started',
                        data: { message: 'Starting log scan...' }
                    }));
                    // Implementation would go here
                    break;

                case 'get-flows':
                    const flows = metricsCollector.getFlows();
                    ws.send(JSON.stringify({
                        type: 'flows',
                        data: flows
                    }));
                    break;

                case 'get-flow-summary':
                    const summary = metricsCollector.getSummary();
                    ws.send(JSON.stringify({
                        type: 'flow-summary',
                        data: summary
                    }));
                    break;

                case 'subscribe-flows':
                    // Start streaming flows to this client
                    ws.flowInterval = setInterval(() => {
                        try {
                            const flows = metricsCollector.getFlows();
                            const summary = metricsCollector.getSummary();
                            ws.send(JSON.stringify({
                                type: 'flows-update',
                                data: { flows, summary }
                            }));
                        } catch (error) {
                            console.error('Error streaming flows:', error.message);
                        }
                    }, 2000); // Update every 2 seconds
                    ws.send(JSON.stringify({
                        type: 'subscribed',
                        data: { message: 'Subscribed to flow updates' }
                    }));
                    break;

                case 'unsubscribe-flows':
                    if (ws.flowInterval) {
                        clearInterval(ws.flowInterval);
                        ws.flowInterval = null;
                    }
                    ws.send(JSON.stringify({
                        type: 'unsubscribed',
                        data: { message: 'Unsubscribed from flow updates' }
                    }));
                    break;

                case 'subscribe-resources':
                    // Start streaming resource updates to this client
                    ws.resourceInterval = setInterval(() => {
                        try {
                            const nodes = resourceAnalyzer.getNodes();
                            const summary = resourceAnalyzer.getSummary();
                            const optimizations = resourceAnalyzer.generateOptimizations();
                            ws.send(JSON.stringify({
                                type: 'resources-update',
                                data: { nodes, summary, optimizations }
                            }));
                        } catch (error) {
                            console.error('Error streaming resources:', error.message);
                        }
                    }, 3000); // Update every 3 seconds
                    ws.send(JSON.stringify({
                        type: 'subscribed',
                        data: { message: 'Subscribed to resource updates' }
                    }));
                    break;

                case 'unsubscribe-resources':
                    if (ws.resourceInterval) {
                        clearInterval(ws.resourceInterval);
                        ws.resourceInterval = null;
                    }
                    ws.send(JSON.stringify({
                        type: 'unsubscribed',
                        data: { message: 'Unsubscribed from resource updates' }
                    }));
                    break;

                default:
                    ws.send(JSON.stringify({
                        type: 'error',
                        error: 'Unknown message type'
                    }));
            }
        } catch (error) {
            console.error('❌ WebSocket error:', error.message);
            ws.send(JSON.stringify({
                type: 'error',
                error: error.message
            }));
        }
    });

    ws.on('close', () => {
        console.log('🔌 WebSocket disconnected');
        // Cleanup intervals
        if (ws.flowInterval) {
            clearInterval(ws.flowInterval);
            ws.flowInterval = null;
        }
        if (ws.resourceInterval) {
            clearInterval(ws.resourceInterval);
            ws.resourceInterval = null;
        }
    });

    // Send initial connection success
    ws.send(JSON.stringify({
        type: 'connected',
        data: { message: 'Connected to K8s Isometric Console' }
    }));
});

// Periodic cleanup of old traces
setInterval(() => {
    logParser.cleanupOldTraces(60); // Keep last 60 minutes
}, 5 * 60 * 1000); // Run every 5 minutes

// Serve React SPA for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/dist/index.html'));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('👁️  ============================================');
    console.log('👁️   K8HOLDER - The All-Seeing Eye');
    console.log('👁️  ============================================');
    console.log('');
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`🔍 Monitoring namespaces: ${NAMESPACES.length > 0 ? NAMESPACES.join(', ') : 'ALL'}`);
    console.log(`🔗 Correlation header: ${CORRELATION_HEADER}`);
    console.log('');
    console.log('📡 API Endpoints:');
    console.log(`   Health:    http://localhost:${PORT}/health`);
    console.log(`   Topology:  http://localhost:${PORT}/api/topology`);
    console.log(`   Traces:    http://localhost:${PORT}/api/traces`);
    console.log(`   Flows:     http://localhost:${PORT}/api/flows`);
    console.log(`   Metrics:   http://localhost:${PORT}/api/metrics`);
    console.log('');
    console.log('🎮 Modes Available:');
    console.log('   1️⃣  Pod Journey Tracer - Request debugging');
    console.log('   2️⃣  Network Flow Visualizer - Traffic monitoring');
    console.log('   3️⃣  Resource Tetris - Resource optimization');
    console.log('');
    console.log('✅ Ready!');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('👋 Server closed');
        process.exit(0);
    });
});
