/**
 * Log Parser for extracting correlation IDs and building request traces
 */

class LogParser {
    constructor(correlationHeader = 'x-request-id') {
        this.correlationHeader = correlationHeader;
        this.traces = new Map(); // Store traces by correlation ID
    }

    /**
     * Parse log lines and extract correlation IDs
     * Expected log format: timestamp level [correlationId] message
     * Examples:
     *   2024-05-01T12:00:00.000Z INFO [req-123] Received request
     *   2024-05-01T12:00:00.100Z INFO [req-123] Calling service-b
     */
    parseLogLine(logLine, podName, namespace) {
        if (!logLine || !logLine.trim()) return null;

        try {
            // Extract timestamp (Kubernetes log format)
            const timestampMatch = logLine.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)/);
            const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();

            // Remove timestamp from line
            const lineWithoutTimestamp = logLine.replace(timestampMatch ? timestampMatch[0] : '', '').trim();

            // Extract correlation ID from various patterns
            let correlationId = null;
            const patterns = [
                // [correlation-id] or [req-123]
                /\[([^\]]+)\]/,
                // correlation-id="xxx" or correlationId="xxx"
                /correlation[-_]?id[=:]\s*["']?([^"'\s]+)["']?/i,
                // request-id="xxx" or requestId="xxx"
                /request[-_]?id[=:]\s*["']?([^"'\s]+)["']?/i,
                // trace-id="xxx" or traceId="xxx"
                /trace[-_]?id[=:]\s*["']?([^"'\s]+)["']?/i,
                // X-Request-ID: xxx (header format in logs)
                new RegExp(`${this.correlationHeader}[=:\\s]+["']?([^"'\\s]+)["']?`, 'i')
            ];

            for (const pattern of patterns) {
                const match = lineWithoutTimestamp.match(pattern);
                if (match && match[1]) {
                    correlationId = match[1];
                    break;
                }
            }

            if (!correlationId) return null;

            // Extract log level
            const levelMatch = lineWithoutTimestamp.match(/\b(TRACE|DEBUG|INFO|WARN|ERROR|FATAL)\b/i);
            const level = levelMatch ? levelMatch[1].toUpperCase() : 'INFO';

            // Extract service calls (looking for patterns like "calling service-b" or "request to http://...")
            const serviceCall = this.extractServiceCall(lineWithoutTimestamp);

            // Build log entry
            const entry = {
                timestamp,
                correlationId,
                podName,
                namespace,
                level,
                message: lineWithoutTimestamp,
                serviceCall,
                rawLine: logLine
            };

            return entry;
        } catch (error) {
            console.error('Error parsing log line:', error.message);
            return null;
        }
    }

    /**
     * Extract service calls from log message
     */
    extractServiceCall(message) {
        const patterns = [
            // "calling service-name" or "call to service-name"
            /(?:calling|call to|requesting|request to)\s+([a-z0-9-]+)/i,
            // HTTP URLs
            /https?:\/\/([a-z0-9.-]+)/i,
            // Service names in kubernetes (service-name.namespace.svc.cluster.local)
            /([a-z0-9-]+)\.([a-z0-9-]+)\.svc\.cluster\.local/i
        ];

        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Parse multiple log lines from a pod
     */
    parsePodLogs(logs, podName, namespace) {
        const lines = logs.split('\n');
        const entries = [];

        for (const line of lines) {
            const entry = this.parseLogLine(line, podName, namespace);
            if (entry) {
                entries.push(entry);

                // Add to traces map
                if (!this.traces.has(entry.correlationId)) {
                    this.traces.set(entry.correlationId, []);
                }
                this.traces.get(entry.correlationId).push(entry);
            }
        }

        return entries;
    }

    /**
     * Build a trace for a specific correlation ID
     */
    buildTrace(correlationId) {
        const entries = this.traces.get(correlationId);
        if (!entries || entries.length === 0) {
            return null;
        }

        // Sort by timestamp
        entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Build the path
        const path = [];
        const seen = new Set();

        for (const entry of entries) {
            const podKey = `${entry.namespace}/${entry.podName}`;

            // Add pod to path if not seen
            if (!seen.has(podKey)) {
                path.push({
                    type: 'pod',
                    namespace: entry.namespace,
                    name: entry.podName,
                    timestamp: entry.timestamp,
                    level: entry.level
                });
                seen.add(podKey);
            }

            // Add service call if present
            if (entry.serviceCall) {
                const svcKey = `svc:${entry.serviceCall}`;
                if (!seen.has(svcKey)) {
                    path.push({
                        type: 'service',
                        name: entry.serviceCall,
                        timestamp: entry.timestamp,
                        fromPod: entry.podName
                    });
                    seen.add(svcKey);
                }
            }
        }

        return {
            correlationId,
            path,
            entries,
            startTime: entries[0].timestamp,
            endTime: entries[entries.length - 1].timestamp,
            duration: new Date(entries[entries.length - 1].timestamp) - new Date(entries[0].timestamp),
            errors: entries.filter(e => e.level === 'ERROR' || e.level === 'FATAL')
        };
    }

    /**
     * Get all correlation IDs
     */
    getCorrelationIds() {
        return Array.from(this.traces.keys());
    }

    /**
     * Clear old traces (keep only last N minutes)
     */
    cleanupOldTraces(keepMinutes = 60) {
        const cutoffTime = new Date(Date.now() - keepMinutes * 60 * 1000);

        for (const [correlationId, entries] of this.traces.entries()) {
            const latestEntry = entries[entries.length - 1];
            if (new Date(latestEntry.timestamp) < cutoffTime) {
                this.traces.delete(correlationId);
            }
        }
    }
}

module.exports = LogParser;
