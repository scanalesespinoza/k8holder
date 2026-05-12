/**
 * Phaser Game Scene for K8HOLDER
 * Handles rendering of Kubernetes cluster in Map view only
 */

// Extend Phaser Scene
Phaser.Scene.prototype.renderCluster = function() {
    // Clear previous graphics
    if (this.graphics) {
        this.graphics.clear();
    } else {
        this.graphics = this.add.graphics();
    }

    // Clear click zones
    if (this.clickZones) {
        this.clickZones.forEach(zone => zone.destroy());
    }
    this.clickZones = [];

    // Clear all text objects to prevent overlapping
    if (this.textObjects) {
        this.textObjects.forEach(text => text.destroy());
    }
    this.textObjects = [];

    if (!this.clusterData) return;

    // Always render map view
    this.renderMapView();
};

// Map View Renderer
Phaser.Scene.prototype.renderMapView = function() {
    const nodes = this.clusterData.nodes || [];
    const flows = this.clusterData.flows || [];

    // Grid layout for nodes - optimized for better space usage
    const BASE_NODE_WIDTH = 300;
    const BASE_NODE_HEIGHT = 250;
    const NODE_PADDING_X = 50;
    const NODE_PADDING_Y = 120; // Increased to prevent overlap between node labels and utilization bars

    // Calculate optimal columns based on number of nodes
    // Prefer wider layouts (more columns) for better space usage
    let cols;
    if (nodes.length <= 3) {
        cols = nodes.length; // 1-3 nodes: use single row
    } else if (nodes.length <= 6) {
        cols = 3; // 4-6 nodes: use 3 columns
    } else if (nodes.length <= 12) {
        cols = 4; // 7-12 nodes: use 4 columns
    } else {
        cols = Math.ceil(Math.sqrt(nodes.length)); // Default to square-ish grid
    }

    nodes.forEach((node, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        const x = col * (BASE_NODE_WIDTH + NODE_PADDING_X) + 100;
        const y = row * (BASE_NODE_HEIGHT + NODE_PADDING_Y) + 100;

        this.drawMapNode(node, x, y);
    });

    // Draw network flows
    this.drawNetworkFlows(flows, nodes);
};

// Draw node in map view
Phaser.Scene.prototype.drawMapNode = function(node, x, y) {
    const width = 300;
    const height = 250;

    // Node color based on REAL usage (efficiency, not requests-based utilization)
    const avgUtil = ((node.efficiency?.cpu || 0) + (node.efficiency?.memory || 0)) / 2;
    let nodeColor = 0x27ae60;
    if (avgUtil > 85) nodeColor = 0xe67e22;
    else if (avgUtil > 60) nodeColor = 0xf39c12;

    // Shadow for depth
    this.graphics.fillStyle(0x000000, 0.3);
    this.graphics.fillRect(x + 5, y + 5, width, height);

    // Node rectangle
    this.graphics.fillStyle(nodeColor, 0.2);
    this.graphics.fillRect(x, y, width, height);

    // Border
    this.graphics.lineStyle(3, nodeColor, 1);
    this.graphics.strokeRect(x, y, width, height);

    // Node label
    const shortName = node.name.length > 20 ? node.name.substring(0, 17) + '...' : node.name;
    const nameText = this.add.text(x + width / 2, y - 30, shortName, {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);
    this.textObjects.push(nameText);

    // Capacity info
    const capacityText = this.add.text(
        x + width / 2,
        y - 12,
        `${node.capacity?.cpu || 0}c / ${((node.capacity?.memory || 0) / 1024).toFixed(0)}GB`,
        {
            fontSize: '11px',
            color: '#aaaaaa'
        }
    ).setOrigin(0.5);
    this.textObjects.push(capacityText);

    // Draw pods in node - improved layout to avoid overlap
    const pods = node.pods || [];
    const padding = 15;
    const spacing = 10;
    let podX = x + padding;
    let podY = y + 40;
    const availableWidth = width - (padding * 2);
    const availableHeight = height - 55; // Reserve space for title and bar
    let rowHeight = 0;

    pods.forEach((pod, podIndex) => {
        const podSize = this.calculatePodSize(pod);
        const podWidth = podSize.width;
        const podHeight = podSize.height;

        // Check if pod fits in current row
        if (podX + podWidth > x + width - padding && podIndex > 0) {
            // Move to next row
            podX = x + padding;
            podY += rowHeight + spacing;
            rowHeight = 0;
        }

        // Check if pod fits in node vertically
        if (podY + podHeight > y + height - 40) {
            return; // Skip if doesn't fit
        }

        this.drawMapPod(pod, podX, podY, podWidth, podHeight);

        // Track max height in row
        rowHeight = Math.max(rowHeight, podHeight);

        podX += podWidth + spacing;
    });

    // Resource utilization bar - only show if REAL usage metrics are available
    if (avgUtil > 0 || (node.efficiency?.cpu !== undefined && node.efficiency?.memory !== undefined)) {
        const barWidth = width * 0.8;
        const barHeight = 20;
        const barX = x + (width - barWidth) / 2;
        const barY = y + height + 10;

        this.graphics.fillStyle(0x000000, 0.5);
        this.graphics.fillRect(barX, barY, barWidth, barHeight);

        const fillWidth = (barWidth - 4) * (avgUtil / 100);
        let fillColor = 0x2ecc71;
        if (avgUtil > 85) fillColor = 0xe74c3c;
        else if (avgUtil > 60) fillColor = 0xf39c12;

        this.graphics.fillStyle(fillColor, 1);
        this.graphics.fillRect(barX + 2, barY + 2, fillWidth, barHeight - 4);

        this.graphics.lineStyle(2, 0xffffff, 1);
        this.graphics.strokeRect(barX, barY, barWidth, barHeight);

        // Percentage text
        const percentText = this.add.text(
            x + width / 2,
            barY + 11,
            `${avgUtil.toFixed(0)}%`,
            {
                fontSize: '12px',
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        this.textObjects.push(percentText);
    }

    // Create click zone for node (after pods, with lower depth)
    // This ensures pod zones have priority over node zone
    const nodeZone = this.add.zone(x + width / 2, y + height / 2, width, height);
    nodeZone.setInteractive({ useHandCursor: true });
    nodeZone.setDepth(0); // Lower depth than pods

    // Click handler - only open modal if was a quick click, not a drag or hold
    let nodeIsDragging = false;
    let nodeDownPos = null;
    let nodeDownTime = null;

    nodeZone.on('pointerdown', (pointer) => {
        nodeIsDragging = false;
        nodeDownPos = { x: pointer.x, y: pointer.y };
        nodeDownTime = Date.now();
    });

    nodeZone.on('pointermove', (pointer) => {
        if (!nodeDownPos) return;

        // Check if moved enough to consider it a drag
        const dx = pointer.x - nodeDownPos.x;
        const dy = pointer.y - nodeDownPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 3) {
            nodeIsDragging = true;
        }
    });

    nodeZone.on('pointerup', () => {
        // Only open modal if it was a quick click (not a drag or hold)
        // If held for > 500ms, it was a drag intention even without movement
        const holdTime = Date.now() - nodeDownTime;
        const wasQuickClick = holdTime < 500;

        // Check EventCoordinator before opening modal
        if (!nodeIsDragging && wasQuickClick && window.EventCoordinator && window.EventCoordinator.canPhaserProcessEvents()) {
            window.showDetailsModal(node);
        }

        nodeDownPos = null;
        nodeDownTime = null;
        nodeIsDragging = false;
    });

    // Tooltip on hover
    let nodeTooltip = null;
    nodeZone.on('pointerover', (pointer) => {
        // Only show tooltip if not hovering over a pod
        const podsZone = this.clickZones.find(z => {
            return z !== nodeZone && z.getBounds().contains(pointer.x, pointer.y);
        });

        if (!podsZone) {
            const nodeInfo = `${node.name} (${node.pods?.length || 0} pods)`;
            nodeTooltip = this.add.text(pointer.x, pointer.y - 20, nodeInfo, {
                fontSize: '12px',
                color: '#ffffff',
                backgroundColor: '#000000aa',
                padding: { x: 8, y: 5 },
                fontStyle: 'bold'
            }).setOrigin(0.5, 1).setDepth(99);
            this.textObjects.push(nodeTooltip);
        }
    });

    nodeZone.on('pointerout', () => {
        if (nodeTooltip) {
            nodeTooltip.destroy();
            nodeTooltip = null;
        }
    });

    this.clickZones.push(nodeZone);
};

// Calculate pod size based on resources
Phaser.Scene.prototype.calculatePodSize = function(pod) {
    const containers = pod.containers || [];
    let totalCpu = 0;
    let totalMemory = 0;

    containers.forEach(c => {
        totalCpu += c.usage?.cpu || c.resources?.requests?.cpu || 100;
        totalMemory += c.usage?.memory || c.resources?.requests?.memory || 256;
    });

    const cpuScale = Math.sqrt(totalCpu / 100);
    const memScale = Math.sqrt(totalMemory / 256);
    const avgScale = (cpuScale + memScale) / 2;

    const BASE_POD_SIZE = 50;
    const scaledSize = BASE_POD_SIZE * Math.max(0.5, Math.min(avgScale, 2.0));

    return {
        width: scaledSize,
        height: scaledSize
    };
};

// Draw pod in map view
Phaser.Scene.prototype.drawMapPod = function(pod, x, y, width, height) {
    const phase = (pod.phase || 'Unknown').toLowerCase();

    // Namespace color scheme (shipping container style)
    const namespaceColors = {
        'production': { base: 0x2980b9, bright: 0x3498db, dark: 0x1a5276 },
        'staging': { base: 0x27ae60, bright: 0x2ecc71, dark: 0x186a3b },
        'development': { base: 0x8e44ad, bright: 0x9b59b6, dark: 0x5b2c6f },
        'kube-system': { base: 0xe74c3c, bright: 0xec7063, dark: 0xa93226 },
        'default': { base: 0x95a5a6, bright: 0xbdc3c7, dark: 0x5d6d7e }
    };

    // Get color based on namespace
    const namespace = pod.namespace || 'default';
    const colorScheme = namespaceColors[namespace] || namespaceColors['default'];

    // Status colors for LED
    const statusColors = {
        running: 0x2ecc71,
        pending: 0xf39c12,
        failed: 0xe74c3c,
        unknown: 0x95a5a6
    };
    const statusColor = statusColors[phase] || statusColors.unknown;

    // ISOMETRIC 3D CONTAINER DRAWING
    const depth = Math.min(width * 0.5, height * 0.3); // Isometric depth

    // Shadow (elliptical)
    this.graphics.fillStyle(0x000000, 0.25);
    this.graphics.fillEllipse(x + width/2 + 3, y + height + 3, width * 0.8, depth * 0.4);

    // TOP FACE (brightest - like sunlight)
    this.graphics.fillStyle(colorScheme.bright, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(x + width/2, y - depth/2);
    this.graphics.lineTo(x + width, y);
    this.graphics.lineTo(x + width/2, y + depth/2);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.lineStyle(1, 0xffffff, 0.3);
    this.graphics.strokePath();

    // LEFT FACE (darker)
    this.graphics.fillStyle(colorScheme.dark, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(x, y + height);
    this.graphics.lineTo(x + width/2, y + height + depth/2);
    this.graphics.lineTo(x + width/2, y + depth/2);
    this.graphics.closePath();
    this.graphics.fillPath();

    // RIGHT FACE (medium brightness)
    this.graphics.fillStyle(colorScheme.base, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(x + width, y);
    this.graphics.lineTo(x + width, y + height);
    this.graphics.lineTo(x + width/2, y + height + depth/2);
    this.graphics.lineTo(x + width/2, y + depth/2);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Container outline for definition
    this.graphics.lineStyle(1.5, colorScheme.dark, 0.8);
    this.graphics.strokeRect(x, y, width, height);

    // Corrugated texture (vertical lines on visible faces)
    this.graphics.lineStyle(0.5, 0x000000, 0.15);
    for (let i = 0; i < 5; i++) {
        const offset = (width / 6) * (i + 1);
        // Right face ridges
        this.graphics.lineTo(x + width - offset * 0.3, y + 5);
        this.graphics.lineTo(x + width/2 + offset * 0.3, y + height - 5);
        this.graphics.stroke();
    }

    // LED Status strip on top edge
    const ledCount = 3;
    const ledWidth = 3;
    const ledSpacing = 5;
    const ledStartX = x + width/2 - (ledCount * ledSpacing)/2;
    for (let i = 0; i < ledCount; i++) {
        this.graphics.fillStyle(statusColor, 0.9);
        this.graphics.fillRect(ledStartX + i * ledSpacing, y - 2, ledWidth, 2);
        // LED highlight
        if (phase === 'running') {
            this.graphics.fillStyle(0xffffff, 0.5);
            this.graphics.fillRect(ledStartX + i * ledSpacing, y - 2, ledWidth, 1);
        }
    }

    // Container code label (like ISO container)
    const containerCode = `${namespace.substring(0, 4).toUpperCase()}`;
    const codeText = this.add.text(x + width * 0.7, y + height * 0.4, containerCode, {
        fontSize: `${Math.max(8, height * 0.15)}px`,
        color: '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 1
    }).setOrigin(0.5).setAlpha(0.8);
    this.textObjects.push(codeText);

    // Create click zone for pod
    const zone = this.add.zone(x + width / 2, y + height / 2, width, height);
    zone.setInteractive({ useHandCursor: true });
    zone.setDepth(1); // Higher depth than node zone - pods have priority

    // Click handler - only open modal if was a quick click, not a drag or hold
    let isDragging = false;
    let downPos = null;
    let downTime = null;

    zone.on('pointerdown', (pointer) => {
        isDragging = false;
        downPos = { x: pointer.x, y: pointer.y };
        downTime = Date.now();
    });

    zone.on('pointermove', (pointer) => {
        if (!downPos) return;

        // Check if moved enough to consider it a drag
        const dx = pointer.x - downPos.x;
        const dy = pointer.y - downPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 3) {
            isDragging = true;
        }
    });

    zone.on('pointerup', () => {
        // Only open modal if it was a quick click (not a drag or hold)
        // If held for > 500ms, it was a drag intention even without movement
        const holdTime = Date.now() - downTime;
        const wasQuickClick = holdTime < 500;

        // Check EventCoordinator before opening modal
        if (!isDragging && wasQuickClick && window.EventCoordinator && window.EventCoordinator.canPhaserProcessEvents()) {
            window.showDetailsModal(pod);
        }

        downPos = null;
        downTime = null;
        isDragging = false;
    });

    // Tooltip on hover
    let tooltip = null;
    zone.on('pointerover', () => {
        // Create tooltip text
        const podName = `${pod.namespace}/${pod.name}`;
        tooltip = this.add.text(x + width / 2, y - 10, podName, {
            fontSize: '11px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 6, y: 4 },
            fontStyle: 'bold'
        }).setOrigin(0.5, 1).setDepth(100);
        this.textObjects.push(tooltip);
    });

    zone.on('pointerout', () => {
        // Remove tooltip
        if (tooltip) {
            tooltip.destroy();
            tooltip = null;
        }
    });

    this.clickZones.push(zone);

    // Draw containers
    const containers = pod.containers || [];
    if (containers.length > 0) {
        const containerWidth = Math.max(6, (width - 10) / containers.length - 2);
        const containerHeight = height - 10;

        containers.forEach((container, index) => {
            const containerX = x + 5 + (index * (containerWidth + 2));
            const containerY = y + 5;

            this.drawContainer(container, containerX, containerY, containerWidth, containerHeight);
        });
    }

    // Status indicator
    this.graphics.fillStyle(color, 1);
    this.graphics.lineStyle(1, 0x000000, 1);
    this.graphics.fillCircle(x + 6, y + 6, 4);
    this.graphics.strokeCircle(x + 6, y + 6, 4);
};

// Draw container
Phaser.Scene.prototype.drawContainer = function(container, x, y, width, height) {
    const state = container.state || 'running';
    const usage = container.usage?.cpu || 0;

    let color = 0x2ecc71;
    if (state !== 'running') {
        color = 0x95a5a6;
    } else {
        if (usage > 85) color = 0xe74c3c;
        else if (usage > 60) color = 0xf39c12;
    }

    this.graphics.fillStyle(color, 1);
    this.graphics.fillRect(x, y, width, height);

    this.graphics.lineStyle(1, 0x000000, 1);
    this.graphics.strokeRect(x, y, width, height);

    // Activity animation for high CPU
    if (usage > 50) {
        const pulse = Math.sin(Date.now() / 300) * 0.5 + 0.5;
        this.graphics.fillStyle(0xffffff, pulse);
        this.graphics.fillCircle(x + width / 2, y + 3, 2);
    }
};

// Draw network flows
Phaser.Scene.prototype.drawNetworkFlows = function(flows, nodes) {
    if (!flows || flows.length === 0) return;

    // Calculate optimal columns - same logic as renderMapView
    const BASE_WIDTH = 300;
    const BASE_HEIGHT = 250;
    const SPACING_X = 50;
    const SPACING_Y = 120;

    let cols;
    if (nodes.length <= 3) {
        cols = nodes.length;
    } else if (nodes.length <= 6) {
        cols = 3;
    } else if (nodes.length <= 12) {
        cols = 4;
    } else {
        cols = Math.ceil(Math.sqrt(nodes.length));
    }

    flows.forEach(flow => {
        // Find source and target nodes
        const sourceNode = nodes.find(n => n.pods?.some(p =>
            `${p.namespace}/${p.name}` === `${flow.source.namespace}/${flow.source.name}`
        ));
        const targetNode = nodes.find(n => n.pods?.some(p =>
            `${p.namespace}/${p.name}` === `${flow.target.namespace}/${flow.target.name}`
        ));

        if (!sourceNode || !targetNode) return;

        const sourceIdx = nodes.indexOf(sourceNode);
        const targetIdx = nodes.indexOf(targetNode);

        // Calculate positions using the same layout algorithm
        const sourceCol = sourceIdx % cols;
        const sourceRow = Math.floor(sourceIdx / cols);
        const sourceX = sourceCol * (BASE_WIDTH + SPACING_X) + 100 + BASE_WIDTH / 2;
        const sourceY = sourceRow * (BASE_HEIGHT + SPACING_Y) + 100 + BASE_HEIGHT / 2;

        const targetCol = targetIdx % cols;
        const targetRow = Math.floor(targetIdx / cols);
        const targetX = targetCol * (BASE_WIDTH + SPACING_X) + 100 + BASE_WIDTH / 2;
        const targetY = targetRow * (BASE_HEIGHT + SPACING_Y) + 100 + BASE_HEIGHT / 2;

        // Draw flow line
        const health = flow.health || 'healthy';
        const colors = {
            healthy: 0x3498db,
            warning: 0xf39c12,
            error: 0xe74c3c
        };

        const color = colors[health] || colors.healthy;
        const thickness = Math.min(2 + Math.log10((flow.metrics?.requestRate || 0) + 1) * 2, 12);

        this.graphics.lineStyle(thickness, color, 0.6);
        this.graphics.beginPath();
        this.graphics.moveTo(sourceX, sourceY);
        this.graphics.lineTo(targetX, targetY);
        this.graphics.strokePath();
    });
};

// Update cluster data
Phaser.Scene.prototype.updateClusterData = function(data) {
    this.clusterData = data;
    this.renderCluster();
};
