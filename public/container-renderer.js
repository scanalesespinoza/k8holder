/**
 * Container Renderer - Realistic 3D Isometric Shipping Containers
 * Renders Kubernetes pods as detailed shipping containers with:
 * - Corrugated metal texture
 * - Container codes and labels
 * - Status LED strips
 * - Weathering and depth
 * - Stacking physics
 */

class ContainerRenderer {
    constructor(ctx) {
        this.ctx = ctx;

        // Container dimensions (isometric pixels)
        this.CONTAINER_WIDTH = 64;   // 40ft container
        this.CONTAINER_HEIGHT = 48;  // Height when viewed isometrically
        this.CONTAINER_DEPTH = 32;   // Depth for 3D effect

        // Colors by namespace/deployment
        this.namespaceColors = {
            'production': { base: '#2980b9', accent: '#3498db', name: 'PROD' },
            'staging': { base: '#27ae60', accent: '#2ecc71', name: 'STAG' },
            'development': { base: '#8e44ad', accent: '#9b59b6', name: 'DEV' },
            'default': { base: '#95a5a6', accent: '#bdc3c7', name: 'DFLT' },
            'kube-system': { base: '#e74c3c', accent: '#ec7063', name: 'SYS' },
            'monitoring': { base: '#f39c12', accent: '#f1c40f', name: 'MON' }
        };

        // Status colors
        this.statusColors = {
            'Running': { led: '#2ecc71', glow: 'rgba(46, 204, 113, 0.6)' },
            'Pending': { led: '#f39c12', glow: 'rgba(243, 156, 18, 0.6)' },
            'Failed': { led: '#e74c3c', glow: 'rgba(231, 76, 60, 0.6)' },
            'Unknown': { led: '#95a5a6', glow: 'rgba(149, 165, 166, 0.6)' }
        };
    }

    /**
     * Draw a single container (pod)
     * @param {Object} pod - Pod data
     * @param {number} x - Screen X position
     * @param {number} y - Screen Y position
     * @param {number} stackIndex - Position in stack (0 = bottom)
     * @param {boolean} isHovered - Is container hovered
     * @param {boolean} isSelected - Is container selected
     */
    drawContainer(pod, x, y, stackIndex = 0, isHovered = false, isSelected = false) {
        const ctx = this.ctx;

        // Adjust Y for stacking
        const stackOffset = stackIndex * (this.CONTAINER_DEPTH - 10);
        y -= stackOffset;

        // Get container color based on namespace
        const namespace = pod.namespace || 'default';
        const colorScheme = this.namespaceColors[namespace] || this.namespaceColors['default'];

        // Get status
        const status = pod.status || 'Unknown';
        const statusColor = this.statusColors[status] || this.statusColors['Unknown'];

        ctx.save();

        // 1. Draw shadow (before container)
        this.drawShadow(x, y, stackIndex);

        // 2. Draw container body (isometric 3D)
        this.drawContainerBody(x, y, colorScheme, isHovered, isSelected);

        // 3. Draw corrugated texture
        this.drawCorrugation(x, y, colorScheme);

        // 4. Draw container details
        this.drawContainerCode(x, y, pod, colorScheme);
        this.drawStatusLED(x, y, statusColor, pod);

        // 5. Draw weathering/age indicators
        this.drawWeathering(x, y, pod);

        // 6. Selection/hover effects
        if (isSelected) {
            this.drawSelectionGlow(x, y, '#3498db');
        } else if (isHovered) {
            this.drawSelectionGlow(x, y, '#f1c40f', 0.5);
        }

        ctx.restore();
    }

    /**
     * Draw container shadow
     */
    drawShadow(x, y, stackIndex) {
        const ctx = this.ctx;
        const w = this.CONTAINER_WIDTH;
        const d = this.CONTAINER_DEPTH;

        // Shadow gets smaller for higher stacks
        const shadowOffset = 8 + stackIndex * 2;
        const shadowAlpha = 0.4 - (stackIndex * 0.05);

        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(shadowAlpha, 0.1)})`;
        ctx.beginPath();
        ctx.ellipse(
            x + w / 2 + shadowOffset,
            y + d + stackIndex * 4 + shadowOffset,
            w / 2,
            d / 4,
            0, 0, Math.PI * 2
        );
        ctx.fill();
    }

    /**
     * Draw 3D isometric container body
     */
    drawContainerBody(x, y, colorScheme, isHovered, isSelected) {
        const ctx = this.ctx;
        const w = this.CONTAINER_WIDTH;
        const h = this.CONTAINER_HEIGHT;
        const d = this.CONTAINER_DEPTH;

        // Lighten if hovered
        const brightnessMult = isHovered ? 1.15 : 1.0;

        // Top face (horizontal)
        ctx.fillStyle = this.adjustBrightness(colorScheme.accent, brightnessMult * 1.3);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w / 2, y - d / 2);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w / 2, y + d / 2);
        ctx.closePath();
        ctx.fill();

        // Top face edge highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Left face
        ctx.fillStyle = this.adjustBrightness(colorScheme.base, brightnessMult * 0.8);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + w / 2, y + h + d / 2);
        ctx.lineTo(x + w / 2, y + d / 2);
        ctx.closePath();
        ctx.fill();

        // Right face (brighter)
        ctx.fillStyle = this.adjustBrightness(colorScheme.base, brightnessMult);
        ctx.beginPath();
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w / 2, y + h + d / 2);
        ctx.lineTo(x + w / 2, y + d / 2);
        ctx.closePath();
        ctx.fill();

        // Outline for definition
        ctx.strokeStyle = this.adjustBrightness(colorScheme.base, 0.6);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + w / 2, y + h + d / 2);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w / 2, y - d / 2);
        ctx.closePath();
        ctx.stroke();
    }

    /**
     * Draw corrugated metal texture
     */
    drawCorrugation(x, y, colorScheme) {
        const ctx = this.ctx;
        const h = this.CONTAINER_HEIGHT;

        // Vertical ridges on left face
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;

        for (let i = 0; i < 8; i++) {
            const offset = i * 8;
            ctx.beginPath();
            ctx.moveTo(x + offset, y + 10);
            ctx.lineTo(x + offset * 0.7, y + h - 5);
            ctx.stroke();
        }

        // Vertical ridges on right face (brighter)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        for (let i = 0; i < 8; i++) {
            const offset = i * 8;
            ctx.beginPath();
            ctx.moveTo(x + this.CONTAINER_WIDTH - offset, y + 10);
            ctx.lineTo(x + this.CONTAINER_WIDTH / 2 + offset * 0.3, y + h - 5);
            ctx.stroke();
        }
    }

    /**
     * Draw container identification code
     */
    drawContainerCode(x, y, pod, colorScheme) {
        const ctx = this.ctx;
        const h = this.CONTAINER_HEIGHT;
        const w = this.CONTAINER_WIDTH;

        // Container code (like MSCU123456-7)
        const code = this.generateContainerCode(pod);
        const namespace = colorScheme.name;

        // Draw on right face (more visible)
        ctx.save();
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'center';

        // Namespace label (like shipping line)
        ctx.fillText(namespace, x + w * 0.75, y + h * 0.3);

        // Container code
        ctx.font = '8px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(code, x + w * 0.75, y + h * 0.45);

        // Pod name (truncated)
        const podName = pod.name.substring(0, 8);
        ctx.font = '7px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(podName, x + w * 0.75, y + h * 0.6);

        ctx.restore();
    }

    /**
     * Draw status LED strip
     */
    drawStatusLED(x, y, statusColor, pod) {
        const ctx = this.ctx;
        const w = this.CONTAINER_WIDTH;

        // LED strip at top edge
        const ledCount = 5;
        const ledWidth = 6;
        const ledSpacing = 8;
        const startX = x + w / 2 - (ledCount * ledSpacing) / 2;
        const ledY = y - 2;

        ctx.save();

        // Glow effect for running pods
        if (pod.status === 'Running') {
            ctx.shadowColor = statusColor.glow;
            ctx.shadowBlur = 8;
        }

        for (let i = 0; i < ledCount; i++) {
            const ledX = startX + i * ledSpacing;

            // LED body
            ctx.fillStyle = statusColor.led;
            ctx.fillRect(ledX, ledY, ledWidth, 3);

            // LED highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(ledX, ledY, ledWidth, 1);
        }

        ctx.restore();
    }

    /**
     * Draw weathering effects based on pod age/health
     */
    drawWeathering(x, y, pod) {
        const ctx = this.ctx;
        const w = this.CONTAINER_WIDTH;
        const h = this.CONTAINER_HEIGHT;

        // Age-based weathering
        const age = pod.age || 0; // in days
        const weatherIntensity = Math.min(age / 365, 0.3); // Max 30% weathering

        if (weatherIntensity > 0.05) {
            ctx.save();

            // Random rust spots
            ctx.fillStyle = `rgba(193, 84, 50, ${weatherIntensity})`;
            const spots = Math.floor(weatherIntensity * 10);
            for (let i = 0; i < spots; i++) {
                const spotX = x + Math.random() * w;
                const spotY = y + Math.random() * h;
                ctx.fillRect(spotX, spotY, 2, 2);
            }

            // Dirt/grime gradient at bottom
            const gradient = ctx.createLinearGradient(x, y + h - 20, x, y + h);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(0, 0, 0, ${weatherIntensity * 0.3})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y + h - 20, w, 20);

            ctx.restore();
        }

        // Health-based damage
        if (pod.restartCount > 5) {
            // Dents/damage indicators
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.lineWidth = 2;
            const dents = Math.min(pod.restartCount, 10);
            for (let i = 0; i < dents; i++) {
                const dX = x + 10 + Math.random() * (w - 20);
                const dY = y + 20 + Math.random() * (h - 40);
                ctx.beginPath();
                ctx.arc(dX, dY, 3, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    /**
     * Draw selection/hover glow
     */
    drawSelectionGlow(x, y, color, alpha = 1.0) {
        const ctx = this.ctx;
        const w = this.CONTAINER_WIDTH;
        const h = this.CONTAINER_HEIGHT;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;

        // Outline the container
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + w / 2, y + h + this.CONTAINER_DEPTH / 2);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w / 2, y - this.CONTAINER_DEPTH / 2);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Generate realistic container code
     */
    generateContainerCode(pod) {
        // Use pod UID to generate consistent code
        const uid = pod.uid || pod.name;
        const hash = this.simpleHash(uid);
        const prefix = this.namespaceColors[pod.namespace]?.name || 'POD';
        const numbers = hash.toString().substring(0, 6);
        const check = hash % 10;
        return `${prefix}${numbers}-${check}`;
    }

    /**
     * Simple hash function for consistent codes
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Adjust color brightness
     */
    adjustBrightness(hexColor, factor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        // Adjust
        const newR = Math.min(255, Math.floor(r * factor));
        const newG = Math.min(255, Math.floor(g * factor));
        const newB = Math.min(255, Math.floor(b * factor));

        // Convert back to hex
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    /**
     * Draw container stack (multiple containers)
     */
    drawContainerStack(pods, x, y, hoveredPod, selectedPod) {
        // Draw from bottom to top for correct layering
        pods.forEach((pod, index) => {
            const isHovered = hoveredPod && hoveredPod.uid === pod.uid;
            const isSelected = selectedPod && selectedPod.uid === pod.uid;
            this.drawContainer(pod, x, y, index, isHovered, isSelected);
        });
    }
}
