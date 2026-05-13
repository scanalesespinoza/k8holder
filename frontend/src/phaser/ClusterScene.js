import Phaser from 'phaser';

/**
 * ClusterScene - Phaser scene for rendering Kubernetes cluster
 * Renders nodes as isometric 3D containers with pods inside
 */
class ClusterScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ClusterScene' });
    this.clusterData = null;
    this.graphics = null;
    this.clickZones = [];
    this.textObjects = [];
    this.onNodeClick = null;
    this.onPodClick = null;
  }

  preload() {
    // No assets to load - using graphics rendering
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // Enable camera dragging
    this.cameras.main.setScroll(0, 0);

    // Drag to pan
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown) {
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
      }
    });

    // Zoom with mouse wheel
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const zoomSpeed = 0.001;
      const newZoom = Phaser.Math.Clamp(
        this.cameras.main.zoom - deltaY * zoomSpeed,
        0.3,
        2.0
      );
      this.cameras.main.setZoom(newZoom);
    });

    // Keyboard shortcuts
    this.input.keyboard.on('keydown-R', () => {
      this.cameras.main.setScroll(0, 0);
      this.cameras.main.setZoom(1.0);
    });

    // Initial render
    this.renderCluster();
  }

  update() {
    // Animation loop if needed
  }

  /**
   * Update cluster data and re-render
   */
  updateClusterData(data) {
    this.clusterData = data;
    this.renderCluster();
  }

  /**
   * Main rendering function
   */
  renderCluster() {
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

    // Clear text objects
    if (this.textObjects) {
      this.textObjects.forEach(text => text.destroy());
    }
    this.textObjects = [];

    if (!this.clusterData || !this.clusterData.nodes) {
      // Draw loading message
      const loadingText = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        'Loading cluster data...',
        {
          fontSize: '24px',
          color: '#ffffff'
        }
      ).setOrigin(0.5);
      this.textObjects = [loadingText];
      return;
    }

    this.renderMapView();
  }

  /**
   * Render map view (2D isometric grid)
   */
  renderMapView() {
    const nodes = this.clusterData.nodes || [];

    // Grid layout
    const BASE_NODE_WIDTH = 300;
    const BASE_NODE_HEIGHT = 250;
    const NODE_PADDING_X = 50;
    const NODE_PADDING_Y = 120;

    // Calculate columns
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

    nodes.forEach((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      const x = col * (BASE_NODE_WIDTH + NODE_PADDING_X) + 100;
      const y = row * (BASE_NODE_HEIGHT + NODE_PADDING_Y) + 100;

      this.drawNode(node, x, y);
    });
  }

  /**
   * Draw a single node container
   */
  drawNode(node, x, y) {
    const width = 300;
    const height = 250;

    // Node color based on efficiency
    const avgUtil = ((node.efficiency?.cpu || 0) + (node.efficiency?.memory || 0)) / 2;
    let nodeColor = 0x27ae60; // Green
    if (avgUtil > 85) nodeColor = 0xe67e22; // Orange
    else if (avgUtil > 60) nodeColor = 0xf39c12; // Yellow

    // Shadow
    this.graphics.fillStyle(0x000000, 0.3);
    this.graphics.fillRect(x + 5, y + 5, width, height);

    // Node background
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
    const cpuCores = (node.capacity?.cpu || 0).toFixed(0);
    const memoryGB = ((node.capacity?.memory || 0) / 1024).toFixed(0);
    const capacityText = this.add.text(
      x + width / 2,
      y - 12,
      `${cpuCores}c / ${memoryGB}GB`,
      {
        fontSize: '11px',
        color: '#aaaaaa'
      }
    ).setOrigin(0.5);
    this.textObjects.push(capacityText);

    // Draw pods
    this.drawPods(node, x, y, width, height);

    // Utilization bar
    if (avgUtil > 0) {
      this.drawUtilizationBar(x, y, width, height, avgUtil);
    }

    // Click zone for node
    this.createNodeClickZone(node, x, y, width, height);
  }

  /**
   * Draw pods inside node
   */
  drawPods(node, nodeX, nodeY, nodeWidth, nodeHeight) {
    const pods = node.pods || [];
    const padding = 15;
    const spacing = 10;
    let podX = nodeX + padding;
    let podY = nodeY + 40;
    let rowHeight = 0;

    pods.forEach((pod, index) => {
      const podSize = this.calculatePodSize(pod);
      const podWidth = podSize.width;
      const podHeight = podSize.height;

      // Check if pod fits in current row
      if (podX + podWidth > nodeX + nodeWidth - padding && index > 0) {
        podX = nodeX + padding;
        podY += rowHeight + spacing;
        rowHeight = 0;
      }

      // Check if pod fits vertically
      if (podY + podHeight <= nodeY + nodeHeight - 40) {
        this.drawPod(pod, podX, podY, podWidth, podHeight);
        rowHeight = Math.max(rowHeight, podHeight);
        podX += podWidth + spacing;
      }
    });
  }

  /**
   * Calculate pod size based on resources
   */
  calculatePodSize(pod) {
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
  }

  /**
   * Draw a single pod (isometric 3D container)
   */
  drawPod(pod, x, y, width, height) {
    const phase = (pod.phase || 'Unknown').toLowerCase();

    // Namespace-based colors (shipping container style)
    const namespaceColors = {
      'production': { base: 0x2980b9, bright: 0x3498db, dark: 0x1a5276 },
      'staging': { base: 0x27ae60, bright: 0x2ecc71, dark: 0x186a3b },
      'development': { base: 0x8e44ad, bright: 0x9b59b6, dark: 0x5b2c6f },
      'kube-system': { base: 0xe74c3c, bright: 0xec7063, dark: 0xa93226 },
      'default': { base: 0x95a5a6, bright: 0xbdc3c7, dark: 0x5d6d7e }
    };

    const namespace = pod.namespace || 'default';
    const colorScheme = namespaceColors[namespace] || namespaceColors['default'];

    // Status colors
    const statusColors = {
      running: 0x2ecc71,
      pending: 0xf39c12,
      failed: 0xe74c3c,
      unknown: 0x95a5a6
    };
    const statusColor = statusColors[phase] || statusColors.unknown;

    // Isometric depth
    const depth = Math.min(width * 0.5, height * 0.3);

    // Shadow (elliptical)
    this.graphics.fillStyle(0x000000, 0.25);
    this.graphics.fillEllipse(x + width/2 + 3, y + height + 3, width * 0.8, depth * 0.4);

    // Top face (brightest)
    this.graphics.fillStyle(colorScheme.bright, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(x + width/2, y - depth/2);
    this.graphics.lineTo(x + width, y);
    this.graphics.lineTo(x + width/2, y + depth/2);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Left face (darker)
    this.graphics.fillStyle(colorScheme.dark, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(x, y + height);
    this.graphics.lineTo(x + width/2, y + height + depth/2);
    this.graphics.lineTo(x + width/2, y + depth/2);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Right face (medium)
    this.graphics.fillStyle(colorScheme.base, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(x + width, y);
    this.graphics.lineTo(x + width, y + height);
    this.graphics.lineTo(x + width/2, y + height + depth/2);
    this.graphics.lineTo(x + width/2, y + depth/2);
    this.graphics.closePath();
    this.graphics.fillPath();

    // LED status indicator
    const ledCount = 3;
    const ledWidth = 3;
    const ledSpacing = 5;
    const ledStartX = x + width/2 - (ledCount * ledSpacing)/2;
    for (let i = 0; i < ledCount; i++) {
      this.graphics.fillStyle(statusColor, 0.9);
      this.graphics.fillRect(ledStartX + i * ledSpacing, y - 2, ledWidth, 2);
    }

    // Container code label
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

    // Status circle
    this.graphics.fillStyle(statusColor, 1);
    this.graphics.lineStyle(1, 0x000000, 1);
    this.graphics.fillCircle(x + 6, y + 6, 4);
    this.graphics.strokeCircle(x + 6, y + 6, 4);

    // Click zone for pod
    this.createPodClickZone(pod, x, y, width, height);
  }

  /**
   * Draw utilization bar below node
   */
  drawUtilizationBar(x, y, width, height, utilization) {
    const barWidth = width * 0.8;
    const barHeight = 20;
    const barX = x + (width - barWidth) / 2;
    const barY = y + height + 10;

    // Background
    this.graphics.fillStyle(0x000000, 0.5);
    this.graphics.fillRect(barX, barY, barWidth, barHeight);

    // Fill
    const fillWidth = (barWidth - 4) * (utilization / 100);
    let fillColor = 0x2ecc71; // Green
    if (utilization > 85) fillColor = 0xe74c3c; // Red
    else if (utilization > 60) fillColor = 0xf39c12; // Orange

    this.graphics.fillStyle(fillColor, 1);
    this.graphics.fillRect(barX + 2, barY + 2, fillWidth, barHeight - 4);

    // Border
    this.graphics.lineStyle(2, 0xffffff, 1);
    this.graphics.strokeRect(barX, barY, barWidth, barHeight);

    // Percentage text
    const percentText = this.add.text(
      x + width / 2,
      barY + barHeight / 2,
      `${utilization.toFixed(0)}%`,
      {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    this.textObjects.push(percentText);
  }

  /**
   * Create click zone for node
   */
  createNodeClickZone(node, x, y, width, height) {
    const zone = this.add.zone(x + width / 2, y + height / 2, width, height);
    zone.setInteractive({ useHandCursor: true });
    zone.setDepth(0);

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
      const dx = pointer.x - downPos.x;
      const dy = pointer.y - downPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 3) isDragging = true;
    });

    zone.on('pointerup', () => {
      const holdTime = Date.now() - downTime;
      const wasQuickClick = holdTime < 500;

      if (!isDragging && wasQuickClick && this.onNodeClick) {
        this.onNodeClick(node);
      }

      downPos = null;
      downTime = null;
      isDragging = false;
    });

    this.clickZones.push(zone);
  }

  /**
   * Create click zone for pod
   */
  createPodClickZone(pod, x, y, width, height) {
    const zone = this.add.zone(x + width / 2, y + height / 2, width, height);
    zone.setInteractive({ useHandCursor: true });
    zone.setDepth(1); // Higher than node

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
      const dx = pointer.x - downPos.x;
      const dy = pointer.y - downPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 3) isDragging = true;
    });

    zone.on('pointerup', () => {
      const holdTime = Date.now() - downTime;
      const wasQuickClick = holdTime < 500;

      if (!isDragging && wasQuickClick && this.onPodClick) {
        this.onPodClick(pod);
      }

      downPos = null;
      downTime = null;
      isDragging = false;
    });

    this.clickZones.push(zone);
  }
}

export default ClusterScene;
