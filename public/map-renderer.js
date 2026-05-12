/**
 * Map Renderer - Vista de mapa (top-down) del cluster
 * Mucho más clara y legible que la vista isométrica
 */

class MapRenderer {
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

        // Layout constants
        this.BASE_NODE_WIDTH = 350;
        this.BASE_NODE_HEIGHT = 250;
        this.NODE_PADDING = 20;
        this.NODE_SPACING = 50;
        this.BASE_POD_SIZE = 30;
        this.POD_SPACING = 8;
        this.CONTAINER_SIZE = 8;
        this.CONTAINER_SPACING = 2;

        // Colors
        this.colors = {
            background: '#1a1a2e',
            grid: 'rgba(52, 152, 219, 0.1)',
            node: {
                bg: 'rgba(44, 62, 80, 0.8)',
                border: '#34495e',
                healthy: '#27ae60',
                warning: '#f39c12',
                critical: '#e67e22',
                offline: '#7f8c8d'
            },
            pod: {
                running: '#2ecc71',
                pending: '#f39c12',
                failed: '#e74c3c',
                unknown: '#95a5a6'
            },
            container: {
                running: {
                    low: '#2ecc71',
                    medium: '#f39c12',
                    high: '#e74c3c'
                },
                waiting: '#95a5a6',
                terminated: '#34495e'
            },
            flow: {
                healthy: 'rgba(52, 152, 219, 0.6)',
                warning: 'rgba(243, 156, 18, 0.6)',
                error: 'rgba(231, 76, 60, 0.6)'
            },
            text: {
                primary: '#ecf0f1',
                secondary: '#bdc3c7',
                label: '#95a5a6'
            }
        };
    }

    /**
     * Renderizar todo el cluster en vista de mapa
     */
    render(clusterData) {
        if (!clusterData) return;

        this.ctx.save();

        // Clear
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply camera transform
        this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);

        // Draw grid
        this.drawGrid();

        // Draw network flows first (under nodes)
        if (clusterData.flows && clusterData.flows.length > 0) {
            this.drawFlows(clusterData);
        }

        // Draw nodes with their pods
        if (clusterData.nodes && clusterData.nodes.length > 0) {
            this.drawNodes(clusterData.nodes);
        }

        this.ctx.restore();
        // Legend y Summary ahora son paneles flotantes, no se dibujan aquí
    }

    /**
     * Draw background grid
     */
    drawGrid() {
        const gridSize = 50;
        const startX = Math.floor(-this.camera.x / this.camera.zoom / gridSize) * gridSize;
        const startY = Math.floor(-this.camera.y / this.camera.zoom / gridSize) * gridSize;
        const endX = startX + (this.canvas.width / this.camera.zoom) + gridSize;
        const endY = startY + (this.canvas.height / this.camera.zoom) + gridSize;

        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        for (let x = startX; x < endX; x += gridSize) {
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
        }

        for (let y = startY; y < endY; y += gridSize) {
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
        }

        this.ctx.stroke();
    }

    /**
     * Calculate node size based on capacity
     */
    calculateNodeSize(node) {
        const cpuCapacity = node.capacity?.cpu || 16;
        const memCapacity = node.capacity?.memory || 65536; // MB

        // Scale factor based on CPU (cores) and Memory (GB)
        const cpuScale = Math.sqrt(cpuCapacity / 16); // Base: 16 cores
        const memScale = Math.sqrt((memCapacity / 1024) / 64); // Base: 64 GB

        const avgScale = (cpuScale + memScale) / 2;

        return {
            width: this.BASE_NODE_WIDTH * Math.max(0.6, Math.min(avgScale, 1.5)),
            height: this.BASE_NODE_HEIGHT * Math.max(0.6, Math.min(avgScale, 1.5))
        };
    }

    /**
     * Calculate pod size based on resource usage
     */
    calculatePodSize(pod) {
        if (!pod.containers || pod.containers.length === 0) {
            return this.BASE_POD_SIZE;
        }

        // Sum of all container resources
        let totalCpu = 0;
        let totalMemory = 0;

        pod.containers.forEach(c => {
            totalCpu += c.usage?.cpu || c.resources?.requests?.cpu || 100;
            totalMemory += c.usage?.memory || c.resources?.requests?.memory || 256;
        });

        // Scale based on total resources
        const cpuScale = Math.sqrt(totalCpu / 100); // Base: 100m
        const memScale = Math.sqrt(totalMemory / 256); // Base: 256Mi

        const avgScale = (cpuScale + memScale) / 2;

        return this.BASE_POD_SIZE * Math.max(0.5, Math.min(avgScale, 2.0));
    }

    /**
     * Draw all nodes in a grid layout
     */
    drawNodes(nodes) {
        const cols = Math.ceil(Math.sqrt(nodes.length));

        // Calculate max node size for spacing
        let maxNodeWidth = this.BASE_NODE_WIDTH;
        let maxNodeHeight = this.BASE_NODE_HEIGHT;
        nodes.forEach(node => {
            const size = this.calculateNodeSize(node);
            maxNodeWidth = Math.max(maxNodeWidth, size.width);
            maxNodeHeight = Math.max(maxNodeHeight, size.height);
        });

        nodes.forEach((node, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = col * (maxNodeWidth + this.NODE_SPACING) + 50;
            const y = row * (maxNodeHeight + this.NODE_SPACING) + 50;

            this.drawNode(node, x, y);
        });
    }

    /**
     * Draw a single node
     */
    drawNode(node, x, y) {
        // Calculate dynamic node size
        const nodeSize = this.calculateNodeSize(node);
        const nodeWidth = nodeSize.width;
        const nodeHeight = nodeSize.height;

        // Determine node health color
        const cpuUtil = node.utilization?.cpu || 0;
        const memUtil = node.utilization?.memory || 0;
        const maxUtil = Math.max(cpuUtil, memUtil);

        let borderColor;
        if (!node.ready) {
            borderColor = this.colors.node.offline;
        } else if (maxUtil > 85) {
            borderColor = this.colors.node.critical;
        } else if (maxUtil > 60) {
            borderColor = this.colors.node.warning;
        } else {
            borderColor = this.colors.node.healthy;
        }

        // Draw node background
        this.ctx.fillStyle = this.colors.node.bg;
        this.ctx.fillRect(x, y, nodeWidth, nodeHeight);

        // Draw node border
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, y, nodeWidth, nodeHeight);

        // Draw node header
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(x, y, nodeWidth, 30);

        // Draw node name
        this.ctx.fillStyle = this.colors.text.primary;
        this.ctx.font = 'bold 12px Arial';
        this.ctx.fillText(node.name, x + 10, y + 20);

        // Draw node stats
        this.ctx.fillStyle = this.colors.text.secondary;
        this.ctx.font = '10px Arial';
        const podCount = node.pods?.length || 0;
        this.ctx.fillText(`${podCount} pods`, x + nodeWidth - 70, y + 20);

        // Draw resource bars
        this.drawResourceBars(node, x, y, nodeWidth);

        // Draw pods in a grid
        if (node.pods && node.pods.length > 0) {
            this.drawPodsInNode(node.pods, x, y + 50, nodeWidth, nodeHeight);
        }
    }

    /**
     * Draw resource utilization bars
     */
    drawResourceBars(node, x, y, nodeWidth) {
        const barY = y + 35;
        const barWidth = nodeWidth - 20;
        const barHeight = 4;

        // CPU bar
        const cpuUtil = node.utilization?.cpu || 0;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(x + 10, barY, barWidth, barHeight);

        const cpuColor = cpuUtil > 85 ? this.colors.node.critical :
                        cpuUtil > 60 ? this.colors.node.warning :
                        this.colors.node.healthy;
        this.ctx.fillStyle = cpuColor;
        this.ctx.fillRect(x + 10, barY, barWidth * (cpuUtil / 100), barHeight);

        // Label
        this.ctx.fillStyle = this.colors.text.label;
        this.ctx.font = '9px Arial';
        this.ctx.fillText(`CPU ${cpuUtil.toFixed(0)}%`, x + 10, barY - 2);

        // Memory bar
        const memUtil = node.utilization?.memory || 0;
        const memBarY = barY + 10;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(x + 10, memBarY, barWidth, barHeight);

        const memColor = memUtil > 85 ? this.colors.node.critical :
                        memUtil > 60 ? this.colors.node.warning :
                        this.colors.node.healthy;
        this.ctx.fillStyle = memColor;
        this.ctx.fillRect(x + 10, memBarY, barWidth * (memUtil / 100), barHeight);

        // Label
        this.ctx.fillStyle = this.colors.text.label;
        this.ctx.fillText(`MEM ${memUtil.toFixed(0)}%`, x + 10, memBarY - 2);
    }

    /**
     * Draw pods in a grid inside a node
     */
    drawPodsInNode(pods, nodeX, nodeY, nodeWidth, nodeHeight) {
        let currentX = nodeX + 10;
        let currentY = nodeY;
        let rowHeight = 0;

        pods.forEach((pod, index) => {
            const podSize = this.calculatePodSize(pod);

            // Check if pod fits in current row
            if (currentX + podSize + this.POD_SPACING > nodeX + nodeWidth - 10) {
                // Move to next row
                currentX = nodeX + 10;
                currentY += rowHeight + this.POD_SPACING;
                rowHeight = 0;
            }

            // Don't draw if outside node bounds
            if (currentY + podSize > nodeY + nodeHeight - this.NODE_PADDING) {
                return;
            }

            this.drawPod(pod, currentX, currentY, podSize);

            // Update position for next pod
            currentX += podSize + this.POD_SPACING;
            rowHeight = Math.max(rowHeight, podSize);
        });
    }

    /**
     * Draw a single pod
     */
    drawPod(pod, x, y, podSize) {
        // Determine pod color
        let color;
        if (pod.phase === 'Running') {
            color = this.colors.pod.running;
        } else if (pod.phase === 'Pending') {
            color = this.colors.pod.pending;
        } else if (pod.phase === 'Failed') {
            color = this.colors.pod.failed;
        } else {
            color = this.colors.pod.unknown;
        }

        // Draw pod background
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, podSize, podSize);

        // Draw pod border
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, podSize, podSize);

        // Draw containers inside pod
        if (pod.containers && pod.containers.length > 0) {
            this.drawContainersInPod(pod.containers, x, y, podSize);
        }

        // Highlight if selected
        if (this.selectedElement?.name === pod.name) {
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x - 2, y - 2, podSize + 4, podSize + 4);
        }
    }

    /**
     * Draw containers inside a pod
     */
    drawContainersInPod(containers, podX, podY, podSize) {
        const availableSize = podSize - 4;
        const containersPerRow = Math.max(1, Math.floor(availableSize / (this.CONTAINER_SIZE + this.CONTAINER_SPACING)));

        containers.forEach((container, index) => {
            const col = index % containersPerRow;
            const row = Math.floor(index / containersPerRow);
            const x = podX + 2 + col * (this.CONTAINER_SIZE + this.CONTAINER_SPACING);
            const y = podY + 2 + row * (this.CONTAINER_SIZE + this.CONTAINER_SPACING);

            // Don't draw if outside pod bounds
            if (y + this.CONTAINER_SIZE > podY + podSize - 2) {
                return;
            }

            // Get container health color based on utilization
            const cpuUsage = container.usage?.cpu || 0;
            const cpuRequest = container.resources?.requests?.cpu || 100;
            const utilization = (cpuUsage / cpuRequest) * 100;

            let color;
            if (container.state !== 'running') {
                color = this.colors.container.waiting;
            } else if (utilization > 85) {
                color = this.colors.container.running.high;
            } else if (utilization > 60) {
                color = this.colors.container.running.medium;
            } else {
                color = this.colors.container.running.low;
            }

            // Draw container
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, this.CONTAINER_SIZE, this.CONTAINER_SIZE);
        });
    }

    /**
     * Draw network flows
     */
    drawFlows(clusterData) {
        if (!clusterData.flows) return;

        // Create a map of pod positions
        const podPositions = new Map();
        clusterData.nodes.forEach((node, nodeIndex) => {
            const cols = Math.ceil(Math.sqrt(clusterData.nodes.length));
            const col = nodeIndex % cols;
            const row = Math.floor(nodeIndex / cols);
            const nodeX = col * (this.NODE_WIDTH + this.NODE_SPACING) + 50;
            const nodeY = row * (this.NODE_HEIGHT + this.NODE_SPACING) + 50;

            if (node.pods) {
                const podsPerRow = Math.floor((this.NODE_WIDTH - 20) / (this.POD_SIZE + this.POD_SPACING));
                node.pods.forEach((pod, podIndex) => {
                    const podCol = podIndex % podsPerRow;
                    const podRow = Math.floor(podIndex / podsPerRow);
                    const x = nodeX + 10 + podCol * (this.POD_SIZE + this.POD_SPACING) + this.POD_SIZE / 2;
                    const y = nodeY + 50 + podRow * (this.POD_SIZE + this.POD_SPACING) + this.POD_SIZE / 2;

                    const key = `${pod.namespace}/${pod.name}`;
                    podPositions.set(key, { x, y });
                });
            }
        });

        // Draw flows between pods
        clusterData.flows.forEach(flow => {
            const sourceKey = `${flow.source.namespace}/${flow.source.name}`;
            const targetKey = `${flow.target.namespace}/${flow.target.name}`;

            const sourcePos = podPositions.get(sourceKey);
            const targetPos = podPositions.get(targetKey);

            if (sourcePos && targetPos) {
                this.drawFlowLine(sourcePos, targetPos, flow);
            }
        });
    }

    /**
     * Draw a single flow line
     */
    drawFlowLine(from, to, flow) {
        const errorRate = flow.metrics?.errorRate || 0;
        const latency = flow.metrics?.latencyP50 || 0;

        let color;
        if (errorRate > 5 || latency > 500) {
            color = this.colors.flow.error;
        } else if (errorRate > 1 || latency > 200) {
            color = this.colors.flow.warning;
        } else {
            color = this.colors.flow.healthy;
        }

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw arrow
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowSize = 8;
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(to.x, to.y);
        this.ctx.lineTo(
            to.x - arrowSize * Math.cos(angle - Math.PI / 6),
            to.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            to.x - arrowSize * Math.cos(angle + Math.PI / 6),
            to.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Draw legend
     */
    drawLegend() {
        const x = 20;
        const y = this.canvas.height - 120;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(x, y, 200, 110);

        this.ctx.strokeStyle = this.colors.node.healthy;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, 200, 110);

        this.ctx.fillStyle = this.colors.text.primary;
        this.ctx.font = 'bold 11px Arial';
        this.ctx.fillText('Pod Status', x + 10, y + 20);

        const items = [
            { color: this.colors.pod.running, label: 'Running' },
            { color: this.colors.pod.pending, label: 'Pending' },
            { color: this.colors.pod.failed, label: 'Failed' }
        ];

        items.forEach((item, index) => {
            const itemY = y + 35 + index * 20;
            this.ctx.fillStyle = item.color;
            this.ctx.fillRect(x + 10, itemY, 12, 12);
            this.ctx.fillStyle = this.colors.text.secondary;
            this.ctx.font = '10px Arial';
            this.ctx.fillText(item.label, x + 30, itemY + 10);
        });
    }

    /**
     * Draw cluster summary
     */
    drawClusterSummary(summary) {
        if (!summary) return;

        const x = this.canvas.width - 220;
        const y = this.canvas.height - 120;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(x, y, 200, 110);

        this.ctx.strokeStyle = this.colors.node.healthy;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, 200, 110);

        this.ctx.fillStyle = this.colors.text.primary;
        this.ctx.font = 'bold 11px Arial';
        this.ctx.fillText('Cluster Summary', x + 10, y + 20);

        this.ctx.fillStyle = this.colors.text.secondary;
        this.ctx.font = '10px Arial';

        const stats = [
            `Nodes: ${summary.nodeCount || 0}`,
            `Pods: ${summary.podCount || 0}`,
            `Flows: ${summary.flowCount || 0}`,
            `CPU: ${(summary.totalCapacity?.cpu || 0).toFixed(0)} cores`,
            `Memory: ${((summary.totalCapacity?.memory || 0) / 1024).toFixed(0)} GB`
        ];

        stats.forEach((stat, index) => {
            this.ctx.fillText(stat, x + 10, y + 40 + index * 15);
        });
    }

    /**
     * Handle click - returns clicked element or null
     */
    handleClick(mouseX, mouseY, clusterData) {
        if (!clusterData || !clusterData.nodes) return null;

        // Convert screen coordinates to world coordinates
        const worldX = (mouseX - this.camera.x) / this.camera.zoom;
        const worldY = (mouseY - this.camera.y) / this.camera.zoom;

        // Check if clicked on a pod or node
        const cols = Math.ceil(Math.sqrt(clusterData.nodes.length));

        // Calculate max node size for spacing
        let maxNodeWidth = this.BASE_NODE_WIDTH;
        let maxNodeHeight = this.BASE_NODE_HEIGHT;
        clusterData.nodes.forEach(node => {
            const size = this.calculateNodeSize(node);
            maxNodeWidth = Math.max(maxNodeWidth, size.width);
            maxNodeHeight = Math.max(maxNodeHeight, size.height);
        });

        for (let nodeIndex = 0; nodeIndex < clusterData.nodes.length; nodeIndex++) {
            const node = clusterData.nodes[nodeIndex];
            const nodeSize = this.calculateNodeSize(node);
            const col = nodeIndex % cols;
            const row = Math.floor(nodeIndex / cols);
            const nodeX = col * (maxNodeWidth + this.NODE_SPACING) + 50;
            const nodeY = row * (maxNodeHeight + this.NODE_SPACING) + 50;

            // Check if clicked on pods within this node
            if (node.pods) {
                let currentX = nodeX + 10;
                let currentY = nodeY + 50;
                let rowHeight = 0;

                for (let podIndex = 0; podIndex < node.pods.length; podIndex++) {
                    const pod = node.pods[podIndex];
                    const podSize = this.calculatePodSize(pod);

                    // Check if pod fits in current row
                    if (currentX + podSize + this.POD_SPACING > nodeX + nodeSize.width - 10) {
                        currentX = nodeX + 10;
                        currentY += rowHeight + this.POD_SPACING;
                        rowHeight = 0;
                    }

                    // Check if clicked on this pod
                    if (worldX >= currentX && worldX <= currentX + podSize &&
                        worldY >= currentY && worldY <= currentY + podSize) {
                        this.selectedElement = pod;
                        console.log('Selected pod:', pod.name);
                        return pod;
                    }

                    currentX += podSize + this.POD_SPACING;
                    rowHeight = Math.max(rowHeight, podSize);
                }
            }

            // Check if clicked on node itself (but not on a pod)
            if (worldX >= nodeX && worldX <= nodeX + nodeSize.width &&
                worldY >= nodeY && worldY <= nodeY + nodeSize.height) {
                this.selectedElement = node;
                console.log('Selected node:', node.name);
                return node;
            }
        }

        this.selectedElement = null;
        return null;
    }

    /**
     * Handle mouse move (for tooltips in the future)
     */
    handleMouseMove(mouseX, mouseY, clusterData) {
        // TODO: Implement hover detection for tooltips
    }
}
