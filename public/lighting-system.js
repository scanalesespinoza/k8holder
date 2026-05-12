/**
 * Industrial Lighting System
 * Handles dynamic lighting, shadows, and atmospheric effects
 */

class LightingSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Time of day (0-24 hours)
        this.timeOfDay = 12; // Start at noon
        this.timeSpeed = 0.01; // Hours per frame (set to 0 for static)

        // Lighting presets
        this.presets = {
            dawn: {
                ambient: { r: 255, g: 200, b: 150, a: 0.2 },
                directional: { r: 255, g: 180, b: 130, a: 0.6 },
                background: '#2c3e50',
                fog: 'rgba(255, 200, 150, 0.1)'
            },
            day: {
                ambient: { r: 255, g: 255, b: 240, a: 0.1 },
                directional: { r: 255, g: 255, b: 230, a: 0.8 },
                background: '#34495e',
                fog: 'rgba(236, 240, 241, 0.05)'
            },
            dusk: {
                ambient: { r: 200, b: 180, b: 220, a: 0.3 },
                directional: { r: 255, g: 150, b: 100, a: 0.7 },
                background: '#2c3e50',
                fog: 'rgba(200, 150, 200, 0.15)'
            },
            night: {
                ambient: { r: 100, g: 120, b: 150, a: 0.6 },
                directional: { r: 150, g: 170, b: 200, a: 0.3 },
                background: '#1a1a2e',
                fog: 'rgba(100, 120, 150, 0.1)'
            }
        };

        // Point lights (flood lights, warning lights, etc.)
        this.pointLights = [];

        // Current lighting state
        this.currentLighting = this.presets.day;
    }

    /**
     * Update lighting based on time of day
     */
    update(deltaTime = 16) {
        if (this.timeSpeed > 0) {
            this.timeOfDay += this.timeSpeed * deltaTime / 1000;
            if (this.timeOfDay >= 24) this.timeOfDay -= 24;
        }

        // Interpolate between lighting presets
        this.currentLighting = this.interpolateLighting(this.timeOfDay);
    }

    /**
     * Get lighting preset based on time
     */
    interpolateLighting(hour) {
        if (hour >= 5 && hour < 7) {
            // Dawn
            return this.lerpPresets(
                this.presets.night,
                this.presets.dawn,
                (hour - 5) / 2
            );
        } else if (hour >= 7 && hour < 9) {
            // Dawn to Day
            return this.lerpPresets(
                this.presets.dawn,
                this.presets.day,
                (hour - 7) / 2
            );
        } else if (hour >= 9 && hour < 17) {
            // Day
            return this.presets.day;
        } else if (hour >= 17 && hour < 19) {
            // Day to Dusk
            return this.lerpPresets(
                this.presets.day,
                this.presets.dusk,
                (hour - 17) / 2
            );
        } else if (hour >= 19 && hour < 21) {
            // Dusk to Night
            return this.lerpPresets(
                this.presets.dusk,
                this.presets.night,
                (hour - 19) / 2
            );
        } else {
            // Night
            return this.presets.night;
        }
    }

    /**
     * Linear interpolation between two lighting presets
     */
    lerpPresets(preset1, preset2, t) {
        return {
            ambient: this.lerpColor(preset1.ambient, preset2.ambient, t),
            directional: this.lerpColor(preset1.directional, preset2.directional, t),
            background: preset2.background, // No interpolation for simplicity
            fog: preset2.fog
        };
    }

    /**
     * Lerp between two colors
     */
    lerpColor(c1, c2, t) {
        return {
            r: c1.r + (c2.r - c1.r) * t,
            g: c1.g + (c2.g - c1.g) * t,
            b: c1.b + (c2.b - c1.b) * t,
            a: c1.a + (c2.a - c1.a) * t
        };
    }

    /**
     * Apply ambient lighting overlay
     */
    applyAmbientLighting() {
        const ctx = this.ctx;
        const light = this.currentLighting.ambient;

        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgba(${light.r}, ${light.g}, ${light.b}, ${light.a})`;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
    }

    /**
     * Apply fog effect
     */
    applyFog(intensity = 1.0) {
        const ctx = this.ctx;

        ctx.save();
        ctx.fillStyle = this.currentLighting.fog;
        ctx.globalAlpha = intensity;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
    }

    /**
     * Get background color for current time
     */
    getBackgroundColor() {
        return this.currentLighting.background;
    }

    /**
     * Add a point light (flood light, warning light, etc.)
     */
    addPointLight(x, y, color, radius, intensity = 1.0, flicker = false) {
        this.pointLights.push({
            x, y, color, radius, intensity, flicker,
            baseIntensity: intensity,
            flickerPhase: Math.random() * Math.PI * 2
        });
    }

    /**
     * Clear all point lights
     */
    clearPointLights() {
        this.pointLights = [];
    }

    /**
     * Render point lights
     */
    renderPointLights(deltaTime = 16) {
        const ctx = this.ctx;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // Additive blending

        this.pointLights.forEach(light => {
            // Update flicker
            if (light.flicker) {
                light.flickerPhase += 0.1;
                light.intensity = light.baseIntensity * (0.8 + Math.sin(light.flickerPhase) * 0.2);
            }

            // Create radial gradient
            const gradient = ctx.createRadialGradient(
                light.x, light.y, 0,
                light.x, light.y, light.radius
            );

            const alpha = light.intensity * 0.6;
            gradient.addColorStop(0, `${light.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(0.5, `${light.color}${Math.floor(alpha * 128).toString(16).padStart(2, '0')}`);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.fillRect(
                light.x - light.radius,
                light.y - light.radius,
                light.radius * 2,
                light.radius * 2
            );
        });

        ctx.restore();
    }

    /**
     * Create flood light effect on node
     */
    addNodeFloodLight(x, y, width, height, intensity = 1.0) {
        // Multiple lights for better coverage
        const lightsPerNode = 4;
        const spacing = width / (lightsPerNode + 1);

        for (let i = 1; i <= lightsPerNode; i++) {
            const lightX = x + spacing * i;
            const lightY = y - 20; // Above the node
            this.addPointLight(
                lightX,
                lightY,
                '#e8f4f8', // Cool white
                150,
                intensity * 0.8,
                false
            );
        }
    }

    /**
     * Add warning light on crane or node
     */
    addWarningLight(x, y, color = '#f39c12') {
        this.addPointLight(x, y, color, 100, 1.0, true);
    }

    /**
     * Add status light for container
     */
    addContainerLight(x, y, status) {
        const colors = {
            'Running': '#2ecc71',
            'Pending': '#f39c12',
            'Failed': '#e74c3c',
            'Unknown': '#95a5a6'
        };

        const color = colors[status] || colors['Unknown'];
        this.addPointLight(x, y, color, 30, 0.8, status === 'Running');
    }

    /**
     * Apply vignette effect
     */
    applyVignette(intensity = 0.5) {
        const ctx = this.ctx;
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const radius = Math.max(this.canvas.width, this.canvas.height) * 0.8;

        ctx.save();

        const gradient = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${intensity})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.restore();
    }

    /**
     * Set time of day manually (0-24)
     */
    setTimeOfDay(hour) {
        this.timeOfDay = hour % 24;
    }

    /**
     * Toggle day/night cycle
     */
    toggleDayNightCycle(enabled) {
        this.timeSpeed = enabled ? 0.01 : 0;
    }

    /**
     * Force specific lighting preset
     */
    setLightingPreset(presetName) {
        if (this.presets[presetName]) {
            this.currentLighting = this.presets[presetName];
            this.timeSpeed = 0; // Disable automatic cycling
        }
    }

    /**
     * Get current time as string
     */
    getTimeString() {
        const hour = Math.floor(this.timeOfDay);
        const minute = Math.floor((this.timeOfDay - hour) * 60);
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
}
