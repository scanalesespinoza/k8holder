/**
 * Network Flow Visualizer - Mode 2
 * Visualizes network traffic between pods as animated rays
 */

class NetworkFlowVisualizer {
    constructor(map, api) {
        this.map = map;
        this.api = api;
        this.flows = [];
        this.particles = []; // Animated particles representing requests
        this.selectedFlow = null;
        this.showMetrics = true;
        this.filterNamespace = null;
        this.updateInterval = null;
    }

    /**
     * Activate this mode
     */
    async activate() {
        console.log('📡 Activating Network Flow Visualizer...');

        // Subscribe to flow updates via WebSocket
        this.api.send('subscribe-flows');

        // Listen for flow updates
        this.api.on('flows-update', (data) => {
            this.flows = data.flows;
            this.updateParticles();
        });

        // Initial load
        await this.loadFlows();

        // Start particle animation
        this.startParticleAnimation();
    }

    /**
     * Deactivate this mode
     */
    pause() {
        console.log('📡 Pausing Network Flow Visualizer...');

        // Unsubscribe from updates
        this.api.send('unsubscribe-flows');

        // Stop particle animation
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Load initial flows
     */
    async loadFlows() {
        try {
            const response = await this.api.get('/api/flows');
            this.flows = response.flows || [];
            console.log(`📡 Loaded ${this.flows.length} network flows`);
        } catch (error) {
            console.error('Error loading flows:', error);
        }
    }

    /**
     * Update particle positions
     */
    updateParticles() {
        // Create particles for each flow
        this.flows.forEach(flow => {
            // Randomly create new particles (simulating traffic)
            if (Math.random() < flow.metrics.requestRate / 1000) {
                this.createParticle(flow);
            }
        });

        // Update existing particles
        this.particles = this.particles.filter(particle => {
            particle.progress += particle.speed;
            return particle.progress < 1; // Remove completed particles
        });
    }

    /**
     * Create a new particle for a flow
     */
    createParticle(flow) {
        const sourceBuilding = this.findBuilding(flow.source);
        const targetBuilding = this.findBuilding(flow.target);

        if (!sourceBuilding || !targetBuilding) return;

        this.particles.push({
            flow,
            source: { x: sourceBuilding.gridX, y: sourceBuilding.gridY },
            target: { x: targetBuilding.gridX, y: targetBuilding.gridY },
            progress: 0,
            speed: 0.01 + Math.random() * 0.02, // Variable speed
            color: this.getFlowColor(flow),
            size: 3 + Math.random() * 3
        });
    }

    /**
     * Find building by pod/service info
     */
    findBuilding(entity) {
        return this.map.buildings.find(b =>
            b.namespace === entity.namespace && b.name === entity.name
        );
    }

    /**
     * Get color based on flow health
     */
    getFlowColor(flow) {
        switch (flow.health) {
            case 'healthy': return '#2ecc71'; // Green
            case 'warning': return '#f39c12'; // Orange
            case 'error': return '#e74c3c'; // Red
            default: return '#3498db'; // Blue
        }
    }

    /**
     * Get ray thickness based on traffic volume
     */
    getRayThickness(flow) {
        const baseThickness = 2;
        const maxThickness = 10;
        const rate = flow.metrics.requestRate;

        // Logarithmic scale
        return Math.min(baseThickness + Math.log10(rate + 1) * 2, maxThickness);
    }

    /**
     * Start particle animation loop
     */
    startParticleAnimation() {
        this.updateInterval = setInterval(() => {
            this.updateParticles();
        }, 50); // Update 20 times per second
    }

    /**
     * Update logic
     */
    update(deltaTime) {
        // Particle updates are handled by the interval
        // This is called by the main game loop
    }

    /**
     * Render network flows
     */
    render(ctx) {
        // Render rays (connections)
        this.renderRays(ctx);

        // Render animated particles
        this.renderParticles(ctx);

        // Render metrics panel if enabled
        if (this.showMetrics) {
            this.renderMetricsPanel(ctx);
        }

        // Render selected flow details
        if (this.selectedFlow) {
            this.renderFlowDetails(ctx);
        }
    }

    /**
     * Render connection rays
     */
    renderRays(ctx) {
        this.flows.forEach(flow => {
            const sourceBuilding = this.findBuilding(flow.source);
            const targetBuilding = this.findBuilding(flow.target);

            if (!sourceBuilding || !targetBuilding) return;

            const sourceIso = IsoUtils.cartToIso(sourceBuilding.gridX, sourceBuilding.gridY);
            const targetIso = IsoUtils.cartToIso(targetBuilding.gridX, targetBuilding.gridY);

            const sourceX = sourceIso.x + this.map.offsetX;
            const sourceY = sourceIso.y + this.map.offsetY;
            const targetX = targetIso.x + this.map.offsetX;
            const targetY = targetIso.y + this.map.offsetY;

            // Draw ray
            ctx.save();
            ctx.strokeStyle = this.getFlowColor(flow);
            ctx.lineWidth = this.getRayThickness(flow);
            ctx.globalAlpha = 0.4;

            // Gradient for depth effect
            const gradient = ctx.createLinearGradient(sourceX, sourceY, targetX, targetY);
            gradient.addColorStop(0, this.getFlowColor(flow));
            gradient.addColorStop(1, this.darkenColor(this.getFlowColor(flow), 30));
            ctx.strokeStyle = gradient;

            ctx.beginPath();
            ctx.moveTo(sourceX, sourceY);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();

            ctx.restore();
        });
    }

    /**
     * Render animated particles
     */
    renderParticles(ctx) {
        this.particles.forEach(particle => {
            // Calculate current position
            const sourceIso = IsoUtils.cartToIso(particle.source.x, particle.source.y);
            const targetIso = IsoUtils.cartToIso(particle.target.x, particle.target.y);

            const x = sourceIso.x + (targetIso.x - sourceIso.x) * particle.progress + this.map.offsetX;
            const y = sourceIso.y + (targetIso.y - sourceIso.y) * particle.progress + this.map.offsetY;

            // Draw particle
            ctx.save();
            ctx.fillStyle = particle.color;
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 10;
            ctx.globalAlpha = 0.8;

            ctx.beginPath();
            ctx.arc(x, y, particle.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
    }

    /**
     * Render metrics panel
     */
    renderMetricsPanel(ctx) {
        const panelX = 10;
        const panelY = 60;
        const panelWidth = 280;
        const panelHeight = 200;

        // Background
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        // Border
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Network Flow Metrics', panelX + 10, panelY + 25);

        // Summary stats
        const summary = this.getSummary();
        ctx.font = '12px Arial';
        let yOffset = panelY + 50;

        const stats = [
            { label: 'Total Flows:', value: summary.totalFlows, color: '#fff' },
            { label: 'Healthy:', value: summary.healthyFlows, color: '#2ecc71' },
            { label: 'Warning:', value: summary.warningFlows, color: '#f39c12' },
            { label: 'Errors:', value: summary.errorFlows, color: '#e74c3c' },
            { label: 'Avg Latency:', value: `${summary.avgLatency.toFixed(1)}ms`, color: '#fff' },
            { label: 'Request Rate:', value: `${summary.totalRequestRate}/s`, color: '#fff' }
        ];

        stats.forEach(stat => {
            ctx.fillStyle = '#aaa';
            ctx.fillText(stat.label, panelX + 15, yOffset);

            ctx.fillStyle = stat.color;
            ctx.textAlign = 'right';
            ctx.fillText(stat.value, panelX + panelWidth - 15, yOffset);
            ctx.textAlign = 'left';

            yOffset += 20;
        });

        ctx.restore();
    }

    /**
     * Render flow details
     */
    renderFlowDetails(ctx) {
        const flow = this.selectedFlow;
        const panelX = 300;
        const panelY = 60;
        const panelWidth = 320;
        const panelHeight = 180;

        // Background
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        // Border
        ctx.strokeStyle = this.getFlowColor(flow);
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Flow Details', panelX + 10, panelY + 25);

        // Flow info
        ctx.font = '12px Arial';
        let yOffset = panelY + 50;

        const details = [
            `Source: ${flow.source.namespace}/${flow.source.name}`,
            `Target: ${flow.target.namespace}/${flow.target.name}`,
            `Health: ${flow.health.toUpperCase()}`,
            ``,
            `Request Rate: ${flow.metrics.requestRate}/s`,
            `Error Rate: ${flow.metrics.errorRate}%`,
            `Latency P50: ${flow.metrics.latencyP50}ms`,
            `Latency P99: ${flow.metrics.latencyP99}ms`
        ];

        details.forEach(detail => {
            if (detail === '') {
                yOffset += 10;
                return;
            }

            ctx.fillStyle = '#fff';
            ctx.fillText(detail, panelX + 15, yOffset);
            yOffset += 18;
        });

        ctx.restore();
    }

    /**
     * Get summary statistics
     */
    getSummary() {
        return {
            totalFlows: this.flows.length,
            healthyFlows: this.flows.filter(f => f.health === 'healthy').length,
            warningFlows: this.flows.filter(f => f.health === 'warning').length,
            errorFlows: this.flows.filter(f => f.health === 'error').length,
            totalRequestRate: this.flows.reduce((sum, f) => sum + f.metrics.requestRate, 0),
            avgLatency: this.flows.length > 0
                ? this.flows.reduce((sum, f) => sum + f.metrics.latencyP50, 0) / this.flows.length
                : 0
        };
    }

    /**
     * Handle click on flow
     */
    handleClick(mouseX, mouseY) {
        // Find if user clicked on a flow ray
        // For simplicity, we'll select flow when clicking on buildings
        const building = this.map.handleClick(mouseX, mouseY);

        if (building) {
            // Find flows related to this building
            const relatedFlow = this.flows.find(f =>
                (f.source.name === building.name && f.source.namespace === building.namespace) ||
                (f.target.name === building.name && f.target.namespace === building.namespace)
            );

            this.selectedFlow = relatedFlow || null;
        } else {
            this.selectedFlow = null;
        }
    }

    /**
     * Darken color helper
     */
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);

        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    /**
     * Toggle metrics panel
     */
    toggleMetrics() {
        this.showMetrics = !this.showMetrics;
    }

    /**
     * Filter by namespace
     */
    filterByNamespace(namespace) {
        this.filterNamespace = namespace;
        // TODO: Implement filtering
    }
}
