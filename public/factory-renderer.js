/**
 * Factory Renderer - Renderiza el cluster como una fábrica isométrica
 * Jerarquía: Cluster > Node > Deployment > Pod > Container
 */

class FactoryRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Camera
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1.0
        };

        // Interaction
        this.selectedElement = null;
        this.hoveredElement = null;

        // Constants - Simplified for clearer view
        this.BASE_UNIT = 15;
        this.BASE_NODE_WIDTH = 250;
        this.BASE_NODE_HEIGHT = 180;
        this.NODE_SPACING = 200; // Increased spacing to reduce overlap
        this.POD_SIZE = 30;
        this.POD_SPACING = 10;

        // Colors
        this.colors = {
            container: {
                running: {
                    low: '#2ecc71',      // <60% uso
                    medium: '#f39c12',   // 60-85%
                    high: '#e74c3c'      // >85%
                },
                waiting: '#95a5a6',
                terminated: '#34495e',
                error: '#c0392b'
            },
            pod: {
                running: '#2ecc71',
                pending: '#f39c12',
                failed: '#e74c3c',
                unknown: '#95a5a6'
            },
            deployment: {
                healthy: '#2ecc71',
                degraded: '#f39c12',
                failed: '#e74c3c'
            },
            node: {
                ready: {
                    low: '#27ae60',
                    medium: '#f39c12',
                    high: '#e67e22'
                },
                notReady: '#7f8c8d'
            },
            network: {
                healthy: '#3498db',
                warning: '#f39c12',
                error: '#e74c3c'
            }
        };
    }

    /**
     * Renderizar toda la fábrica
     */
    render(clusterData) {
        if (!clusterData) return;

        this.ctx.save();

        // Clear
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply camera transform
        this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);

        // 1. Render floor grid
        this.renderFloor();

        // 2. Render nodes (factory plants)
        if (clusterData.nodes) {
            clusterData.nodes.forEach((node, index) => {
                this.renderNode(node, index);
            });
        }

        // 3. Render network flows (conveyor belts)
        if (clusterData.flows) {
            clusterData.flows.forEach(flow => {
                this.renderFlow(flow, clusterData.nodes);
            });
        }

        // 4. Render active requests (moving packages)
        if (clusterData.activeRequests) {
            clusterData.activeRequests.forEach(request => {
                this.renderRequest(request);
            });
        }

        this.ctx.restore();

        // 5. Render UI overlay (no camera transform)
        this.renderUI(clusterData);
    }

    /**
     * Render floor grid - Simplified
     */
    renderFloor() {
        const gridSize = 80;
        const rows = 15;
        const cols = 15;

        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.05)';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const x = i * gridSize;
                const y = j * gridSize;

                // Simple grid lines (not isometric diamonds)
                this.ctx.strokeRect(x, y, gridSize, gridSize);
            }
        }

        this.ctx.restore();
    }

    /**
     * Render a node (factory plant)
     */
    renderNode(node, nodeIndex) {
        const bounds = this.getNodeBounds(node, nodeIndex);

        // 1. Draw node container
        this.drawNodeContainer(bounds, node);

        // 2. Group pods by deployment
        const deploymentGroups = this.groupPodsByDeployment(node.pods || []);

        // 3. Render each deployment area
        let yOffset = bounds.y + 40;
        Object.entries(deploymentGroups).forEach(([deploymentName, pods]) => {
            const deploymentBounds = {
                x: bounds.x + 30,
                y: yOffset,
                width: bounds.width - 60,
                height: 100
            };

            this.renderDeployment(deploymentName, pods, deploymentBounds, node);
            yOffset += 120;
        });

        // 4. Render standalone pods (no deployment)
        const standalonePods = (node.pods || []).filter(p => !p.deployment);
        if (standalonePods.length > 0) {
            standalonePods.forEach((pod, index) => {
                const podPos = {
                    x: bounds.x + 30 + (index % 3) * 80,
                    y: yOffset + Math.floor(index / 3) * 60
                };
                this.renderPod(pod, podPos);
            });
        }

        // 5. Resource bar
        this.drawResourceBar(node, bounds);

        // 6. Node label
        this.drawNodeLabel(node, bounds);
    }

    /**
     * Get node physical bounds
     */
    getNodeBounds(node, nodeIndex) {
        const cols = 3; // Nodes per row
        const row = Math.floor(nodeIndex / cols);
        const col = nodeIndex % cols;

        const size = this.calculateNodeSize(node);

        return {
            x: col * (this.BASE_NODE_WIDTH + this.NODE_SPACING) + 100,
            y: row * (this.BASE_NODE_HEIGHT + this.NODE_SPACING) + 100,
            width: size.width,
            height: size.height,
            depth: 50
        };
    }

    /**
     * Calculate node size based on capacity
     */
    calculateNodeSize(node) {
        const cpuScale = Math.sqrt((node.capacity?.cpu || 16) / 16);
        const memScale = Math.sqrt((node.capacity?.memory || 65536) / 65536);

        return {
            width: this.BASE_NODE_WIDTH * Math.max(cpuScale, 0.5),
            height: this.BASE_NODE_HEIGHT * Math.max(memScale, 0.5)
        };
    }

    /**
     * Draw node container (factory plant) - Simplified for clarity
     */
    drawNodeContainer(bounds, node) {
        const color = this.getNodeColor(node);

        this.ctx.save();

        // Simple shadow for depth effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(bounds.x + 5, bounds.y + 5, bounds.width, bounds.height);

        // Main node rectangle
        this.ctx.fillStyle = this.adjustBrightness(color, -20);
        this.ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

        // Border
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

        // Highlight if selected
        if (this.selectedElement?.type === 'node' && this.selectedElement?.name === node.name) {
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = 5;
            this.ctx.setLineDash([10, 5]);
            this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
            this.ctx.setLineDash([]);
        }

        this.ctx.restore();
    }

    /**
     * Draw resource utilization bar - Simplified
     */
    drawResourceBar(node, bounds) {
        const barWidth = bounds.width * 0.8;
        const barHeight = 20;
        const barX = bounds.x + (bounds.width - barWidth) / 2;
        const barY = bounds.y + bounds.height + 10;

        const cpuPercent = node.utilization?.cpu || 0;
        const memPercent = node.utilization?.memory || 0;
        const avgPercent = (cpuPercent + memPercent) / 2;

        this.ctx.save();

        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // Fill
        const fillWidth = (barWidth - 4) * (avgPercent / 100);
        let fillColor = this.colors.node.ready.low;
        if (avgPercent > 85) fillColor = this.colors.node.ready.high;
        else if (avgPercent > 60) fillColor = this.colors.node.ready.medium;

        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(barX + 2, barY + 2, fillWidth, barHeight - 4);

        // Border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Label
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${avgPercent.toFixed(0)}%`, bounds.x + bounds.width / 2, barY + 15);

        this.ctx.restore();
    }

    /**
     * Draw node label - Simplified
     */
    drawNodeLabel(node, bounds) {
        this.ctx.save();
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#000';
        this.ctx.shadowBlur = 4;

        const centerX = bounds.x + bounds.width / 2;

        // Node name
        const shortName = node.name.length > 20 ? node.name.substring(0, 17) + '...' : node.name;
        this.ctx.fillText(shortName, centerX, bounds.y - 30);

        // Capacity info
        this.ctx.font = '11px Arial';
        this.ctx.fillStyle = '#aaa';
        this.ctx.fillText(
            `${node.capacity?.cpu || 0}c / ${((node.capacity?.memory || 0) / 1024).toFixed(0)}GB`,
            centerX,
            bounds.y - 12
        );

        this.ctx.restore();
    }

    /**
     * Group pods by deployment
     */
    groupPodsByDeployment(pods) {
        const groups = {};

        pods.forEach(pod => {
            const deployment = pod.deployment || 'standalone';
            if (!groups[deployment]) {
                groups[deployment] = [];
            }
            groups[deployment].push(pod);
        });

        return groups;
    }

    /**
     * Render deployment area (production line) - Simplified
     */
    renderDeployment(deploymentName, pods, bounds, node) {
        if (deploymentName === 'standalone') return;

        // Deployment area border
        this.ctx.save();
        this.ctx.strokeStyle = this.colors.deployment.healthy;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 3]);
        this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.ctx.setLineDash([]);

        // Label
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText(deploymentName, bounds.x + 10, bounds.y + 15);

        // Replica count
        this.ctx.font = '10px Arial';
        this.ctx.fillStyle = '#aaa';
        this.ctx.fillText(`${pods.length} replica(s)`, bounds.x + 10, bounds.y + 30);

        this.ctx.restore();

        // Render pods
        pods.forEach((pod, index) => {
            const podPos = {
                x: bounds.x + 20 + (index % 4) * 70,
                y: bounds.y + 40 + Math.floor(index / 4) * 50
            };
            this.renderPod(pod, podPos);
        });
    }

    /**
     * Render pod (work station) - Simplified
     */
    renderPod(pod, position) {
        const color = this.getPodColor(pod);
        const containers = pod.containers || [];
        const podWidth = Math.max(40, containers.length * 15 + 10);
        const podHeight = 35;

        this.ctx.save();

        // Shadow for depth
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(position.x + 2, position.y + 2, podWidth, podHeight);

        // Pod background
        this.ctx.fillStyle = this.adjustBrightness(color, -40);
        this.ctx.fillRect(position.x, position.y, podWidth, podHeight);

        // Border
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(position.x, position.y, podWidth, podHeight);

        // Containers
        containers.forEach((container, index) => {
            const containerX = position.x + 5 + (index * 15);
            const containerY = position.y + 5;
            this.renderContainer(container, { x: containerX, y: containerY });
        });

        // Status indicator
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(position.x + 8, position.y + 8, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();
    }


    /**
     * Render container (cube) - Simplified to small rectangles
     */
    renderContainer(container, position) {
        const color = this.getContainerColor(container);
        const width = 10;
        const height = 25;

        this.ctx.save();

        // Container rectangle
        this.ctx.fillStyle = color;
        this.ctx.fillRect(position.x, position.y, width, height);

        // Border
        this.ctx.strokeStyle = this.adjustBrightness(color, -30);
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(position.x, position.y, width, height);

        // Activity animation if high CPU
        if ((container.usage?.cpu || 0) > 50) {
            const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
            this.ctx.globalAlpha = pulse;
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(position.x + width / 2, position.y + 2, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }


    /**
     * Render network flow (conveyor belt) - Simplified
     */
    renderFlow(flow, nodes) {
        // Find source and target positions
        const sourceNode = nodes.find(n => n.pods?.some(p =>
            `${p.namespace}/${p.name}` === `${flow.source.namespace}/${flow.source.name}`
        ));
        const targetNode = nodes.find(n => n.pods?.some(p =>
            `${p.namespace}/${p.name}` === `${flow.target.namespace}/${flow.target.name}`
        ));

        if (!sourceNode || !targetNode) return;

        const sourceIdx = nodes.indexOf(sourceNode);
        const targetIdx = nodes.indexOf(targetNode);
        const sourceBounds = this.getNodeBounds(sourceNode, sourceIdx);
        const targetBounds = this.getNodeBounds(targetNode, targetIdx);

        const sourcePos = {
            x: sourceBounds.x + sourceBounds.width / 2,
            y: sourceBounds.y + sourceBounds.height / 2
        };
        const targetPos = {
            x: targetBounds.x + targetBounds.width / 2,
            y: targetBounds.y + targetBounds.height / 2
        };

        // Draw conveyor
        this.drawConveyor(sourcePos, targetPos, flow);
    }

    /**
     * Draw conveyor belt
     */
    drawConveyor(from, to, flow) {
        const color = this.getFlowColor(flow);
        const thickness = this.calculateFlowThickness(flow.metrics?.requestRate || 0);

        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = thickness;
        this.ctx.globalAlpha = 0.6;

        // Animated dash
        const dashOffset = (Date.now() / 50) % 20;
        this.ctx.setLineDash([10, 10]);
        this.ctx.lineDashOffset = -dashOffset;

        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();

        this.ctx.restore();
    }

    /**
     * Calculate flow thickness based on request rate
     */
    calculateFlowThickness(requestRate) {
        const baseThickness = 2;
        const maxThickness = 12;
        return Math.min(baseThickness + Math.log10(requestRate + 1) * 2, maxThickness);
    }

    /**
     * Render moving request (package) - Simplified
     */
    renderRequest(request) {
        // Interpolate position along path
        const pos = this.interpolateRequestPosition(request);
        if (!pos) return;

        // Draw as small moving rectangle
        this.ctx.save();
        this.ctx.fillStyle = request.color || '#e74c3c';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;

        const size = 8;
        this.ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size);
        this.ctx.strokeRect(pos.x - size / 2, pos.y - size / 2, size, size);

        this.ctx.restore();
    }

    /**
     * Render UI overlay
     */
    renderUI(clusterData) {
        // Cluster info
        this.drawClusterInfo(clusterData);

        // Selected element info
        if (this.selectedElement) {
            this.drawElementInfo(this.selectedElement);
        }
    }

    /**
     * Draw cluster summary info
     */
    drawClusterInfo(clusterData) {
        const panelX = 10;
        const panelY = 10;
        const panelWidth = 250;
        const panelHeight = 120;

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText('Cluster Overview', panelX + 10, panelY + 25);

        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#aaa';
        const nodeCount = clusterData.nodes?.length || 0;
        const podCount = (clusterData.nodes || []).reduce((sum, n) => sum + (n.pods?.length || 0), 0);
        const flowCount = clusterData.flows?.length || 0;

        this.ctx.fillText(`Nodes: ${nodeCount}`, panelX + 15, panelY + 50);
        this.ctx.fillText(`Pods: ${podCount}`, panelX + 15, panelY + 70);
        this.ctx.fillText(`Flows: ${flowCount}`, panelX + 15, panelY + 90);

        this.ctx.restore();
    }

    /**
     * Draw selected element info panel
     */
    drawElementInfo(element) {
        const panelX = this.canvas.width - 310;
        const panelY = 10;
        const panelWidth = 300;
        const panelHeight = 200;

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        this.ctx.strokeStyle = '#e74c3c';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(`Selected: ${element.type}`, panelX + 10, panelY + 25);

        this.ctx.font = '12px Arial';
        let y = panelY + 50;

        switch(element.type) {
            case 'node':
                this.ctx.fillText(`Name: ${element.name}`, panelX + 10, y);
                y += 20;
                this.ctx.fillText(`CPU: ${element.capacity?.cpu || 0} cores`, panelX + 10, y);
                y += 20;
                this.ctx.fillText(`Memory: ${((element.capacity?.memory || 0) / 1024).toFixed(0)} GB`, panelX + 10, y);
                break;
            case 'pod':
                this.ctx.fillText(`Name: ${element.name}`, panelX + 10, y);
                y += 20;
                this.ctx.fillText(`Namespace: ${element.namespace}`, panelX + 10, y);
                y += 20;
                this.ctx.fillText(`Phase: ${element.phase}`, panelX + 10, y);
                break;
        }

        this.ctx.restore();
    }

    // ==================== UTILITY FUNCTIONS ====================

    adjustBrightness(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));

        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    getNodeColor(node) {
        if (!node.ready) return this.colors.node.notReady;

        const avgUtil = ((node.utilization?.cpu || 0) + (node.utilization?.memory || 0)) / 2;

        if (avgUtil > 85) return this.colors.node.ready.high;
        if (avgUtil > 60) return this.colors.node.ready.medium;
        return this.colors.node.ready.low;
    }

    getPodColor(pod) {
        const phase = (pod.phase || 'Unknown').toLowerCase();
        return this.colors.pod[phase] || this.colors.pod.unknown;
    }

    getContainerColor(container) {
        const state = container.state || 'running';

        if (state !== 'running') {
            return this.colors.container[state] || this.colors.container.waiting;
        }

        const usage = container.usage?.cpu || 0;
        if (usage > 85) return this.colors.container.running.high;
        if (usage > 60) return this.colors.container.running.medium;
        return this.colors.container.running.low;
    }

    getFlowColor(flow) {
        const health = flow.health || 'healthy';
        return this.colors.network[health] || this.colors.network.healthy;
    }

    interpolateRequestPosition(request) {
        // TODO: Implement path interpolation
        return null;
    }

    /**
     * Handle click for element selection
     */
    handleClick(mouseX, mouseY, clusterData) {
        // TODO: Implement ray picking for isometric view
        console.log('Click at', mouseX, mouseY);
        return null; // Return null for now - isometric picking not implemented
    }

    /**
     * Handle mouse move for hover
     */
    handleMouseMove(mouseX, mouseY, clusterData) {
        // TODO: Implement hover detection
    }
}
