/**
 * Request Journey Tracer - Animates request path through cluster
 */

class RequestTracer {
    constructor(map) {
        this.map = map;
        this.trace = null;
        this.currentStep = 0;
        this.position = { x: 0, y: 0 };
        this.targetPosition = { x: 0, y: 0 };
        this.speed = 0.05;
        this.playing = false;
        this.paused = false;
        this.color = '#e74c3c';
        this.path = [];
        this.completedSteps = [];
    }

    /**
     * Load a trace and start journey
     */
    loadTrace(trace) {
        this.trace = trace;
        this.currentStep = 0;
        this.completedSteps = [];
        this.playing = true;
        this.paused = false;

        // Build path from trace
        this.buildPath();

        // Start at first position
        if (this.path.length > 0) {
            this.position = { ...this.path[0].position };
            this.targetPosition = { ...this.path[0].position };
        }

        console.log(`🎬 Loaded trace ${trace.correlationId} with ${this.path.length} steps`);
    }

    /**
     * Build animated path from trace data
     */
    buildPath() {
        this.path = [];

        if (!this.trace || !this.trace.path) {
            console.warn('No trace path available');
            return;
        }

        for (const step of this.trace.path) {
            let building = null;

            if (step.type === 'pod') {
                building = this.map.getBuildingByPod(step.namespace, step.name);
            } else if (step.type === 'service') {
                // Find building by service name
                building = this.map.buildings.find(b =>
                    b.name === step.name && b.type === 'service'
                );
            }

            if (building) {
                this.path.push({
                    type: step.type,
                    name: step.name,
                    namespace: step.namespace,
                    position: { x: building.gridX, y: building.gridY },
                    building: building,
                    timestamp: step.timestamp,
                    level: step.level
                });
            } else {
                console.warn(`Could not find building for ${step.type} ${step.name}`);
            }
        }
    }

    /**
     * Update animation
     */
    update(deltaTime) {
        if (!this.playing || this.paused || this.path.length === 0) {
            return;
        }

        // Move towards target
        const dx = this.targetPosition.x - this.position.x;
        const dy = this.targetPosition.y - this.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.1) {
            // Still moving
            this.position.x += dx * this.speed * deltaTime * 0.01;
            this.position.y += dy * this.speed * deltaTime * 0.01;
        } else {
            // Reached target, move to next step
            this.completedSteps.push(this.currentStep);
            this.currentStep++;

            if (this.currentStep >= this.path.length) {
                // Journey complete
                console.log('✅ Journey complete');
                this.playing = false;
                this.currentStep = this.path.length - 1;
            } else {
                // Move to next target
                this.targetPosition = { ...this.path[this.currentStep].position };
            }
        }
    }

    /**
     * Render the request character
     */
    render(ctx) {
        if (!this.trace || this.path.length === 0) {
            return;
        }

        const isoPos = IsoUtils.cartToIso(this.position.x, this.position.y);
        const x = isoPos.x + this.map.offsetX;
        const y = isoPos.y + this.map.offsetY;

        // Draw character
        IsoUtils.drawCharacter(ctx, x, y, this.color);

        // Draw path trail
        this.renderPath(ctx);

        // Draw current step info
        if (this.currentStep < this.path.length) {
            const currentStepData = this.path[this.currentStep];
            this.renderStepInfo(ctx, currentStepData);
        }
    }

    /**
     * Render the path trail
     */
    renderPath(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.4)';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();

        for (let i = 0; i < this.path.length - 1; i++) {
            const current = this.path[i].position;
            const next = this.path[i + 1].position;

            const isoStart = IsoUtils.cartToIso(current.x, current.y);
            const isoEnd = IsoUtils.cartToIso(next.x, next.y);

            if (i === 0) {
                ctx.moveTo(
                    isoStart.x + this.map.offsetX,
                    isoStart.y + this.map.offsetY
                );
            }

            ctx.lineTo(
                isoEnd.x + this.map.offsetX,
                isoEnd.y + this.map.offsetY
            );
        }

        ctx.stroke();
        ctx.restore();

        // Draw step markers
        for (let i = 0; i < this.path.length; i++) {
            const step = this.path[i];
            const isoPos = IsoUtils.cartToIso(step.position.x, step.position.y);

            const completed = this.completedSteps.includes(i);
            const current = i === this.currentStep;

            ctx.save();
            ctx.fillStyle = completed ? '#27ae60' : current ? '#f39c12' : 'rgba(255, 255, 255, 0.5)';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(
                isoPos.x + this.map.offsetX,
                isoPos.y + this.map.offsetY,
                8,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.stroke();

            // Draw step number
            ctx.fillStyle = '#000';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                (i + 1).toString(),
                isoPos.x + this.map.offsetX,
                isoPos.y + this.map.offsetY
            );

            ctx.restore();
        }
    }

    /**
     * Render current step information
     */
    renderStepInfo(ctx, stepData) {
        ctx.save();

        const panelWidth = 300;
        const panelHeight = 100;
        const panelX = 10;
        const panelY = 10;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        // Border
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';

        ctx.fillText(`Step ${this.currentStep + 1} of ${this.path.length}`, panelX + 10, panelY + 25);
        ctx.font = '12px Arial';
        ctx.fillText(`Type: ${stepData.type}`, panelX + 10, panelY + 45);
        ctx.fillText(`Name: ${stepData.name}`, panelX + 10, panelY + 65);
        ctx.fillText(`Namespace: ${stepData.namespace}`, panelX + 10, panelY + 85);

        ctx.restore();
    }

    /**
     * Controls
     */
    play() {
        this.playing = true;
        this.paused = false;
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
    }

    stop() {
        this.playing = false;
        this.paused = false;
        this.currentStep = 0;
        this.completedSteps = [];
        if (this.path.length > 0) {
            this.position = { ...this.path[0].position };
            this.targetPosition = { ...this.path[0].position };
        }
    }

    reset() {
        this.stop();
        this.loadTrace(this.trace);
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            playing: this.playing,
            paused: this.paused,
            currentStep: this.currentStep,
            totalSteps: this.path.length,
            progress: this.path.length > 0 ? (this.currentStep / this.path.length) * 100 : 0
        };
    }
}
