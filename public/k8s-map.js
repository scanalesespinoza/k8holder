/**
 * Kubernetes Cluster Map - Isometric visualization of cluster topology
 */

class K8sClusterMap {
    constructor(topology) {
        this.topology = topology;
        this.offsetX = 400;
        this.offsetY = 100;
        this.buildings = []; // Services/Deployments as buildings
        this.gridSize = 20; // Virtual grid size
        this.selectedBuilding = null;

        this.buildMap();
    }

    /**
     * Build the isometric map from topology data
     */
    buildMap() {
        this.buildings = [];

        // Group pods by service/deployment
        const groupedPods = this.groupPods();

        let gridX = 0;
        let gridY = 0;
        const spacingX = 3;
        const spacingY = 3;

        // Create buildings for each service
        for (const [key, group] of Object.entries(groupedPods)) {
            const building = {
                id: key,
                name: group.name,
                namespace: group.namespace,
                type: group.type, // 'service' or 'deployment'
                gridX,
                gridY,
                pods: group.pods,
                color: this.getColorForNamespace(group.namespace),
                height: Math.min(group.pods.length * 20, 100), // Building height based on pod count
                healthy: group.pods.every(p => p.phase === 'Running')
            };

            this.buildings.push(building);

            // Move grid position
            gridX += spacingX;
            if (gridX >= this.gridSize) {
                gridX = 0;
                gridY += spacingY;
            }
        }

        console.log(`🏗️ Created ${this.buildings.length} buildings from topology`);
    }

    /**
     * Group pods by their owning service or deployment
     */
    groupPods() {
        const groups = {};

        // Group by services
        for (const [key, pods] of Object.entries(this.topology.serviceToPods)) {
            if (pods.length > 0) {
                const [namespace, name] = key.split('/');
                groups[key] = {
                    name,
                    namespace,
                    type: 'service',
                    pods
                };
            }
        }

        // Group by deployments (for pods not covered by services)
        const coveredPods = new Set();
        Object.values(groups).forEach(g => g.pods.forEach(p => coveredPods.add(`${p.namespace}/${p.name}`)));

        for (const [key, pods] of Object.entries(this.topology.deploymentToPods)) {
            const uncoveredPods = pods.filter(p => !coveredPods.has(`${p.namespace}/${p.name}`));
            if (uncoveredPods.length > 0) {
                const [namespace, name] = key.split('/');
                groups[`deploy-${key}`] = {
                    name,
                    namespace,
                    type: 'deployment',
                    pods: uncoveredPods
                };
            }
        }

        return groups;
    }

    /**
     * Get color for namespace
     */
    getColorForNamespace(namespace) {
        const colors = {
            'default': '#3498db',
            'kube-system': '#9b59b6',
            'openshift': '#e74c3c',
            'openshift-monitoring': '#f39c12',
            'istio-system': '#1abc9c'
        };

        return colors[namespace] || this.hashColor(namespace);
    }

    /**
     * Generate consistent color from string
     */
    hashColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        const h = hash % 360;
        return `hsl(${h}, 60%, 50%)`;
    }

    /**
     * Draw a 3D building (isometric)
     */
    drawBuilding(ctx, building) {
        const isoPos = IsoUtils.cartToIso(building.gridX, building.gridY);
        const x = isoPos.x + this.offsetX;
        const y = isoPos.y + this.offsetY;
        const height = building.height;

        // Determine color
        let color = building.color;
        if (!building.healthy) {
            color = '#e74c3c'; // Red for unhealthy
        }
        if (building === this.selectedBuilding) {
            color = '#f1c40f'; // Yellow for selected
        }

        // Draw base (ground tile)
        IsoUtils.drawTile(ctx, x, y, this.darkenColor(color, 30));

        // Draw building (stacked tiles for height effect)
        const levels = Math.ceil(height / IsoUtils.TILE_HEIGHT);
        for (let i = 0; i < levels; i++) {
            const levelY = y - (i * IsoUtils.TILE_HEIGHT * 0.5);
            const levelColor = i === levels - 1 ? color : this.darkenColor(color, 10 * i);
            IsoUtils.drawTile(ctx, x, levelY, levelColor);
        }

        // Draw label
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';

        const labelY = y - (levels * IsoUtils.TILE_HEIGHT * 0.5) - 10;

        ctx.strokeText(building.name, x, labelY);
        ctx.fillText(building.name, x, labelY);

        // Draw pod count
        ctx.font = '10px Arial';
        const podText = `${building.pods.length} pod${building.pods.length > 1 ? 's' : ''}`;
        ctx.strokeText(podText, x, labelY + 15);
        ctx.fillText(podText, x, labelY + 15);

        ctx.restore();

        // Store click area for interaction
        building.clickArea = {
            x: x - IsoUtils.TILE_WIDTH / 2,
            y: y - IsoUtils.TILE_HEIGHT / 2 - (levels * IsoUtils.TILE_HEIGHT * 0.5),
            width: IsoUtils.TILE_WIDTH,
            height: IsoUtils.TILE_HEIGHT + (levels * IsoUtils.TILE_HEIGHT * 0.5)
        };
    }

    /**
     * Darken color
     */
    darkenColor(color, percent) {
        if (color.startsWith('hsl')) {
            return color.replace(/(\d+)%\)/, (match, lightness) => {
                return `${Math.max(0, parseInt(lightness) - percent)}%)`;
            });
        }

        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);

        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    /**
     * Render the entire map
     */
    render(ctx) {
        // Sort buildings by Y position for proper isometric layering
        const sorted = [...this.buildings].sort((a, b) => {
            if (a.gridY !== b.gridY) return a.gridY - b.gridY;
            return a.gridX - b.gridX;
        });

        for (const building of sorted) {
            this.drawBuilding(ctx, building);
        }
    }

    /**
     * Handle click on map
     */
    handleClick(mouseX, mouseY) {
        for (const building of this.buildings) {
            if (building.clickArea) {
                const { x, y, width, height } = building.clickArea;

                // Simple rectangular hit test
                if (mouseX >= x && mouseX <= x + width &&
                    mouseY >= y && mouseY <= y + height) {
                    this.selectedBuilding = building;
                    return building;
                }
            }
        }

        this.selectedBuilding = null;
        return null;
    }

    /**
     * Get building by pod name
     */
    getBuildingByPod(namespace, podName) {
        for (const building of this.buildings) {
            const pod = building.pods.find(p =>
                p.namespace === namespace && p.name === podName
            );
            if (pod) {
                return building;
            }
        }
        return null;
    }

    /**
     * Update topology data
     */
    updateTopology(newTopology) {
        this.topology = newTopology;
        this.buildMap();
    }
}
