/**
 * K8s API Service
 * Connects to the existing Node.js backend API
 */

const API_BASE_URL = '/api';
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

class K8sAPI {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectInterval = null;
  }

  /**
   * Fetch cluster topology data
   */
  async getTopology() {
    try {
      const response = await fetch(`${API_BASE_URL}/topology`);
      if (!response.ok) throw new Error('Failed to fetch topology');
      return await response.json();
    } catch (error) {
      console.error('Error fetching topology:', error);
      throw error;
    }
  }

  /**
   * Fetch network flows
   */
  async getNetworkFlows() {
    try {
      const response = await fetch(`${API_BASE_URL}/network-flows`);
      if (!response.ok) throw new Error('Failed to fetch flows');
      return await response.json();
    } catch (error) {
      console.error('Error fetching flows:', error);
      throw error;
    }
  }

  /**
   * Fetch resource optimization suggestions
   */
  async getOptimizations() {
    try {
      const response = await fetch(`${API_BASE_URL}/optimizations`);
      if (!response.ok) throw new Error('Failed to fetch optimizations');
      return await response.json();
    } catch (error) {
      console.error('Error fetching optimizations:', error);
      throw error;
    }
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket(onUpdate) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onUpdate) onUpdate(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected, attempting to reconnect...');
      this.attemptReconnect(onUpdate);
    };
  }

  /**
   * Attempt to reconnect WebSocket
   */
  attemptReconnect(onUpdate) {
    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        console.log('Attempting WebSocket reconnection...');
        this.connectWebSocket(onUpdate);
      }, 5000);
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  /**
   * Get health status
   */
  async getHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}

export default new K8sAPI();
