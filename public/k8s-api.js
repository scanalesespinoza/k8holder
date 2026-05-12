/**
 * API Client for K8s Backend
 */

class K8sAPI {
    constructor(baseURL = '', wsURL = '') {
        this.baseURL = baseURL || window.location.origin;
        // Use wss:// for HTTPS sites, ws:// for HTTP
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.wsURL = wsURL || `${wsProtocol}//${window.location.host}`;
        this.ws = null;
        this.wsHandlers = new Map();
        this.connected = false;
    }

    /**
     * Connect to WebSocket
     */
    connectWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.wsURL);

                this.ws.onopen = () => {
                    console.log('✅ WebSocket connected');
                    this.connected = true;
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        console.log('📨 WebSocket message:', message.type);

                        // Call registered handlers
                        const handler = this.wsHandlers.get(message.type);
                        if (handler) {
                            handler(message.data);
                        }
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    this.connected = false;
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('🔌 WebSocket disconnected');
                    this.connected = false;

                    // Auto-reconnect after 5 seconds
                    setTimeout(() => {
                        console.log('🔄 Attempting to reconnect...');
                        this.connectWebSocket();
                    }, 5000);
                };
            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                reject(error);
            }
        });
    }

    /**
     * Register a handler for WebSocket messages
     */
    on(messageType, handler) {
        this.wsHandlers.set(messageType, handler);
    }

    /**
     * Send WebSocket message
     */
    send(type, data = {}) {
        if (this.ws && this.connected) {
            this.ws.send(JSON.stringify({ type, ...data }));
        } else {
            console.error('WebSocket not connected');
        }
    }

    /**
     * HTTP GET request
     */
    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`GET ${endpoint} failed:`, error);
            throw error;
        }
    }

    /**
     * HTTP POST request
     */
    async post(endpoint, data = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`POST ${endpoint} failed:`, error);
            throw error;
        }
    }

    // API Methods

    async getHealth() {
        return this.get('/health');
    }

    async getTopology() {
        return this.get('/api/topology');
    }

    async getNamespaces() {
        return this.get('/api/namespaces');
    }

    async getPodLogs(namespace, podName, tailLines = 100) {
        return this.get(`/api/pods/${namespace}/${podName}/logs?tailLines=${tailLines}`);
    }

    async getTraces() {
        return this.get('/api/traces');
    }

    async getTrace(correlationId) {
        return this.get(`/api/traces/${correlationId}`);
    }

    async scanLogs(tailLines = 100) {
        return this.post('/api/scan-logs', { tailLines });
    }
}
