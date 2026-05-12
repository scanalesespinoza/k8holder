/**
 * Resource Tetris - Mode 3
 * Visualizes node resources as containers with pods as Tetris blocks
 */

class ResourceTetris {
    constructor(map, api) {
        this.map = map;
        this.api = api;
        this.nodes = [];
        this.optimizations = [];
        this.summary = null;
        this.selectedNode = null;
        this.showOptimizations = true;
        this.showCostSavings = true;
        this.updateInterval = null;
        this.draggedPod = null;
        this.simulationMode = false;
    }

    /**
     * Activate this mode
     */
    async activate() {
        console.log('🧩 Activating Resource Tetris...');

        // Subscribe to resource updates via WebSocket
        this.api.send('subscribe-resources');

        // Listen for resource updates
        this.api.on('resources-update', (data) => {
            this.nodes = data.nodes;
            this.summary = data.summary;
            this.optimizations = data.optimizations;
            this.updateNodeBuildings();
        });

        // Initial load
        await this.loadResources();
    }

    /**
     * Deactivate this mode
     */
    pause() {
        console.log('🧩 Pausing Resource Tetris...');

        // Unsubscribe from updates
        this.api.send('unsubscribe-resources');

        // Stop any intervals
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Load initial resources
     */
    async loadResources() {
        try {
            const [resourcesRes, summaryRes, optimizationsRes] = await Promise.all([
                this.api.get('/api/resources'),
                this.api.get('/api/resources/summary'),
                this.api.get('/api/optimizations')
            ]);

            this.nodes = resourcesRes.nodes || [];
            this.summary = summaryRes;
            this.optimizations = optimizationsRes.suggestions || [];

            console.log(`🧩 Loaded ${this.nodes.length} nodes`);
            this.updateNodeBuildings();
        } catch (error) {
            console.error('Error loading resources:', error);
        }
    }

    /**
     * Update map buildings to represent nodes
     */
    updateNodeBuildings() {
        this.map.buildings = this.nodes.map((node, index) => {
            const gridX = (index % 4) * 3;
            const gridY = Math.floor(index / 4) * 3;

            return {
                gridX,
                gridY,
                height: 5, // Fixed container height
                color: this.getNodeColor(node),
                name: node.name,
                namespace: 'cluster',
                type: 'node',
                nodeData: node,
                pods: node.pods || []
            };
        });
    }

    /**
     * Get color based on node utilization
     */
    getNodeColor(node) {
        const avgUtilization = (node.utilization.cpu + node.utilization.memory) / 2;

        if (!node.ready) {
            return '#95a5a6'; // Gray for not ready
        } else if (!node.schedulable) {
            return '#e67e22'; // Orange for unschedulable
        } else if (avgUtilization > 80) {
            return '#e74c3c'; // Red for high utilization
        } else if (avgUtilization > 60) {
            return '#f39c12'; // Orange for medium utilization
        } else if (avgUtilization > 40) {
            return '#3498db'; // Blue for normal utilization
        } else {
            return '#2ecc71'; // Green for low utilization
        }
    }

    /**
     * Get pod block color based on resource usage
     */
    getPodColor(pod, node) {
        const cpuUtilization = node.allocatable.cpu > 0
            ? (pod.requests.cpu / node.allocatable.cpu) * 100
            : 0;
        const memoryUtilization = node.allocatable.memory > 0
            ? (pod.requests.memory / node.allocatable.memory) * 100
            : 0;

        const avgUtilization = (cpuUtilization + memoryUtilization) / 2;

        if (avgUtilization > 20) {
            return '#e74c3c'; // Red for large pods
        } else if (avgUtilization > 10) {
            return '#f39c12'; // Orange for medium pods
        } else {
            return '#3498db'; // Blue for small pods
        }
    }

    /**
     * Calculate pod block size
     */
    getPodBlockSize(pod, node) {
        const cpuRatio = node.allocatable.cpu > 0
            ? pod.requests.cpu / node.allocatable.cpu
            : 0;
        const memoryRatio = node.allocatable.memory > 0
            ? pod.requests.memory / node.allocatable.memory
            : 0;

        // Size based on resource consumption
        const size = Math.max(0.3, Math.min(1, (cpuRatio + memoryRatio) / 2));

        return {
            width: size * 40,
            height: size * 20
        };
    }

    /**
     * Update logic
     */
    update(deltaTime) {
        // Animation updates if needed
    }

    /**
     * Render Resource Tetris visualization
     */
    render(ctx) {
        // Render node containers
        this.renderNodeContainers(ctx);

        // Render pod blocks inside containers
        this.renderPodBlocks(ctx);

        // Render waste indicators
        this.renderWasteIndicators(ctx);

        // Render cluster summary panel
        this.renderSummaryPanel(ctx);

        // Render optimizations panel
        if (this.showOptimizations) {
            this.renderOptimizationsPanel(ctx);
        }

        // Render cost savings if enabled
        if (this.showCostSavings && this.optimizations.length > 0) {
            this.renderCostSavingsPanel(ctx);
        }

        // Render selected node details
        if (this.selectedNode) {
            this.renderNodeDetails(ctx);
        }
    }

    /**
     * Render node containers
     */
    renderNodeContainers(ctx) {
        this.map.buildings.forEach(building => {
            if (building.type !== 'node') return;

            const node = building.nodeData;
            const iso = IsoUtils.cartToIso(building.gridX, building.gridY);
            const x = iso.x + this.map.offsetX;
            const y = iso.y + this.map.offsetY;

            // Draw container base
            ctx.save();

            // Container outline
            ctx.strokeStyle = building.color;
            ctx.lineWidth = 3;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';

            // Draw stacked tiles for container height
            for (let h = 0; h < building.height; h++) {
                const offsetY = -h * IsoUtils.TILE_HEIGHT / 2;
                this.drawContainerTile(ctx, x, y + offsetY, building.color);
            }

            // Container label
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(node.name, x, y - building.height * IsoUtils.TILE_HEIGHT / 2 - 10);

            // Utilization label
            const avgUtil = ((node.utilization.cpu + node.utilization.memory) / 2).toFixed(0);
            ctx.font = '9px Arial';
            ctx.fillStyle = '#aaa';
            ctx.fillText(`${avgUtil}%`, x, y - building.height * IsoUtils.TILE_HEIGHT / 2);

            ctx.restore();
        });
    }

    /**
     * Draw a single container tile
     */
    drawContainerTile(ctx, x, y, color) {
        const w = IsoUtils.TILE_WIDTH / 2;
        const h = IsoUtils.TILE_HEIGHT / 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h * 2);
        ctx.lineTo(x - w, y + h);
        ctx.closePath();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * Render pod blocks inside containers
     */
    renderPodBlocks(ctx) {
        this.map.buildings.forEach(building => {
            if (building.type !== 'node') return;

            const node = building.nodeData;
            const iso = IsoUtils.cartToIso(building.gridX, building.gridY);
            const baseX = iso.x + this.map.offsetX;
            const baseY = iso.y + this.map.offsetY;

            // Stack pods inside the container
            let stackY = baseY - 10;

            building.pods.forEach((pod, index) => {
                const size = this.getPodBlockSize(pod, node);
                const color = this.getPodColor(pod, node);

                // Draw pod block
                ctx.save();
                ctx.fillStyle = color;
                ctx.strokeStyle = this.darkenColor(color, 30);
                ctx.lineWidth = 2;

                // Tetris block (small rectangle)
                const blockX = baseX - size.width / 2;
                const blockY = stackY - size.height;

                ctx.fillRect(blockX, blockY, size.width, size.height);
                ctx.strokeRect(blockX, blockY, size.width, size.height);

                // Pod label
                ctx.fillStyle = '#fff';
                ctx.font = '8px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(
                    pod.name.substring(0, 8),
                    baseX,
                    blockY + size.height / 2
                );

                ctx.restore();

                stackY -= size.height + 2;
            });
        });
    }

    /**
     * Render waste indicators
     */
    renderWasteIndicators(ctx) {
        this.map.buildings.forEach(building => {
            if (building.type !== 'node') return;

            const node = building.nodeData;
            const iso = IsoUtils.cartToIso(building.gridX, building.gridY);
            const baseX = iso.x + this.map.offsetX;
            const baseY = iso.y + this.map.offsetY;

            // Show waste percentage as visual indicator
            const wastePercent = ((node.waste.cpuPercent + node.waste.memoryPercent) / 2);

            if (wastePercent > 30) {
                // Draw waste indicator
                ctx.save();
                ctx.fillStyle = 'rgba(241, 196, 15, 0.3)';
                ctx.strokeStyle = '#f1c40f';
                ctx.lineWidth = 2;

                const wasteHeight = (wastePercent / 100) * building.height * IsoUtils.TILE_HEIGHT / 2;

                ctx.fillRect(
                    baseX + 40,
                    baseY - wasteHeight,
                    20,
                    wasteHeight
                );
                ctx.strokeRect(
                    baseX + 40,
                    baseY - wasteHeight,
                    20,
                    wasteHeight
                );

                // Label
                ctx.fillStyle = '#f1c40f';
                ctx.font = 'bold 9px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(
                    `${wastePercent.toFixed(0)}% waste`,
                    baseX + 50,
                    baseY - wasteHeight - 5
                );

                ctx.restore();
            }
        });
    }

    /**
     * Render cluster summary panel
     */
    renderSummaryPanel(ctx) {
        if (!this.summary) return;

        const panelX = 10;
        const panelY = 60;
        const panelWidth = 300;
        const panelHeight = 220;

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
        ctx.fillText('Cluster Resources', panelX + 10, panelY + 25);

        // Summary stats
        ctx.font = '12px Arial';
        let yOffset = panelY + 50;

        const stats = [
            { label: 'Nodes:', value: this.summary.nodeCount, color: '#fff' },
            { label: 'CPU Capacity:', value: `${this.summary.capacity.cpu.toFixed(1)} cores`, color: '#fff' },
            { label: 'CPU Allocatable:', value: `${this.summary.allocatable.cpu.toFixed(1)} cores`, color: '#fff' },
            { label: 'CPU Utilization:', value: `${this.summary.utilization.cpu.toFixed(1)}%`, color: this.getUtilizationColor(this.summary.utilization.cpu) },
            { label: 'CPU Efficiency:', value: `${this.summary.efficiency.cpu.toFixed(1)}%`, color: this.getEfficiencyColor(this.summary.efficiency.cpu) },
            { label: 'CPU Waste:', value: `${this.summary.wastePercent.cpu.toFixed(1)}%`, color: '#f39c12' },
            { label: '', value: '', color: '#fff' },
            { label: 'Memory Capacity:', value: `${(this.summary.capacity.memory / 1024).toFixed(1)} GB`, color: '#fff' },
            { label: 'Memory Utilization:', value: `${this.summary.utilization.memory.toFixed(1)}%`, color: this.getUtilizationColor(this.summary.utilization.memory) },
            { label: 'Memory Waste:', value: `${this.summary.wastePercent.memory.toFixed(1)}%`, color: '#f39c12' }
        ];

        stats.forEach(stat => {
            if (stat.label === '') {
                yOffset += 10;
                return;
            }

            ctx.fillStyle = '#aaa';
            ctx.fillText(stat.label, panelX + 15, yOffset);

            ctx.fillStyle = stat.color;
            ctx.textAlign = 'right';
            ctx.fillText(stat.value, panelX + panelWidth - 15, yOffset);
            ctx.textAlign = 'left';

            yOffset += 18;
        });

        ctx.restore();
    }

    /**
     * Render optimizations panel
     */
    renderOptimizationsPanel(ctx) {
        const panelX = 320;
        const panelY = 60;
        const panelWidth = 340;
        const panelHeight = 300;

        // Background
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        // Border
        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Optimization Suggestions', panelX + 10, panelY + 25);

        // Count
        ctx.font = '11px Arial';
        ctx.fillStyle = '#aaa';
        ctx.fillText(`${this.optimizations.length} suggestions found`, panelX + 10, panelY + 45);

        // List optimizations
        ctx.font = '11px Arial';
        let yOffset = panelY + 70;

        this.optimizations.slice(0, 8).forEach((opt, index) => {
            // Priority indicator
            const priorityColor = opt.priority === 'high' ? '#e74c3c' : '#f39c12';
            ctx.fillStyle = priorityColor;
            ctx.fillRect(panelX + 15, yOffset - 8, 4, 12);

            // Title
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Arial';
            ctx.fillText(opt.title, panelX + 25, yOffset);

            // Description
            ctx.font = '10px Arial';
            ctx.fillStyle = '#aaa';
            const description = opt.description.substring(0, 50) + (opt.description.length > 50 ? '...' : '');
            ctx.fillText(description, panelX + 25, yOffset + 14);

            // Savings if available
            if (opt.potentialSavings) {
                ctx.fillStyle = '#2ecc71';
                ctx.fillText(
                    `Save: $${opt.potentialSavings.monthly}/month`,
                    panelX + 25,
                    yOffset + 28
                );
            }

            yOffset += 45;
        });

        ctx.restore();
    }

    /**
     * Render cost savings panel
     */
    renderCostSavingsPanel(ctx) {
        const consolidationOpts = this.optimizations.filter(o => o.type === 'consolidation');
        if (consolidationOpts.length === 0) return;

        const panelX = 10;
        const panelY = 290;
        const panelWidth = 300;
        const panelHeight = 120;

        // Background
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        // Border
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // Title
        ctx.fillStyle = '#2ecc71';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('Potential Cost Savings', panelX + 10, panelY + 25);

        const savings = consolidationOpts[0].potentialSavings;

        ctx.font = '12px Arial';
        let yOffset = panelY + 50;

        const savingsStats = [
            { label: 'Hourly:', value: `$${savings.hourly}`, color: '#fff' },
            { label: 'Daily:', value: `$${savings.daily}`, color: '#fff' },
            { label: 'Monthly:', value: `$${savings.monthly}`, color: '#2ecc71' },
            { label: 'Yearly:', value: `$${savings.yearly}`, color: '#2ecc71' }
        ];

        savingsStats.forEach(stat => {
            ctx.fillStyle = '#aaa';
            ctx.fillText(stat.label, panelX + 15, yOffset);

            ctx.fillStyle = stat.color;
            ctx.textAlign = 'right';
            ctx.font = stat.color === '#2ecc71' ? 'bold 12px Arial' : '12px Arial';
            ctx.fillText(stat.value, panelX + panelWidth - 15, yOffset);
            ctx.textAlign = 'left';

            yOffset += 20;
        });

        ctx.restore();
    }

    /**
     * Render node details
     */
    renderNodeDetails(ctx) {
        const node = this.selectedNode;
        const panelX = 670;
        const panelY = 60;
        const panelWidth = 300;
        const panelHeight = 350;

        // Background
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        // Border
        ctx.strokeStyle = this.getNodeColor(node);
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(node.name, panelX + 10, panelY + 25);

        // Node info
        ctx.font = '11px Arial';
        let yOffset = panelY + 50;

        const details = [
            `Roles: ${node.roles.join(', ')}`,
            `Status: ${node.ready ? 'Ready' : 'NotReady'} / ${node.schedulable ? 'Schedulable' : 'Unschedulable'}`,
            `Pods: ${node.podCount} / ${node.allocatable.pods}`,
            '',
            `CPU:`,
            `  Capacity: ${node.capacity.cpu.toFixed(2)} cores`,
            `  Allocatable: ${node.allocatable.cpu.toFixed(2)} cores`,
            `  Requests: ${node.requests.cpu.toFixed(2)} cores`,
            `  Utilization: ${node.utilization.cpu.toFixed(1)}%`,
            `  Waste: ${node.waste.cpu.toFixed(2)} cores (${node.waste.cpuPercent.toFixed(1)}%)`,
            '',
            `Memory:`,
            `  Capacity: ${(node.capacity.memory / 1024).toFixed(1)} GB`,
            `  Allocatable: ${(node.allocatable.memory / 1024).toFixed(1)} GB`,
            `  Requests: ${(node.requests.memory / 1024).toFixed(1)} GB`,
            `  Utilization: ${node.utilization.memory.toFixed(1)}%`,
            `  Waste: ${(node.waste.memory / 1024).toFixed(1)} GB (${node.waste.memoryPercent.toFixed(1)}%)`
        ];

        details.forEach(detail => {
            if (detail === '') {
                yOffset += 10;
                return;
            }

            ctx.fillStyle = detail.startsWith(' ') ? '#aaa' : '#fff';
            ctx.fillText(detail, panelX + 15, yOffset);
            yOffset += 16;
        });

        ctx.restore();
    }

    /**
     * Get utilization color
     */
    getUtilizationColor(utilization) {
        if (utilization > 80) return '#e74c3c';
        if (utilization > 60) return '#f39c12';
        if (utilization > 40) return '#3498db';
        return '#2ecc71';
    }

    /**
     * Get efficiency color
     */
    getEfficiencyColor(efficiency) {
        if (efficiency > 70) return '#2ecc71';
        if (efficiency > 50) return '#3498db';
        if (efficiency > 30) return '#f39c12';
        return '#e74c3c';
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
     * Handle click on node
     */
    handleClick(mouseX, mouseY) {
        // Find if user clicked on a node building
        const building = this.map.handleClick(mouseX, mouseY);

        if (building && building.type === 'node') {
            this.selectedNode = building.nodeData;
        } else {
            this.selectedNode = null;
        }
    }

    /**
     * Toggle optimizations panel
     */
    toggleOptimizations() {
        this.showOptimizations = !this.showOptimizations;
    }

    /**
     * Toggle cost savings panel
     */
    toggleCostSavings() {
        this.showCostSavings = !this.showCostSavings;
    }
}
