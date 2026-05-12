/**
 * Animation System for Container Platform
 * Handles smooth animations for container operations:
 * - Crane movements (loading/unloading containers)
 * - Container deployment (lowering from crane)
 * - Vehicle movements (network traffic)
 * - Stack operations (growing/shrinking stacks)
 */

class AnimationSystem {
    constructor() {
        this.animations = [];
        this.animationId = 0;
    }

    /**
     * Update all active animations
     */
    update(deltaTime = 16) {
        // Update and remove completed animations
        this.animations = this.animations.filter(anim => {
            anim.update(deltaTime);
            return !anim.isComplete();
        });
    }

    /**
     * Render all animations
     */
    render(ctx) {
        this.animations.forEach(anim => anim.render(ctx));
    }

    /**
     * Create crane deployment animation
     * Shows crane moving to position and lowering container
     */
    animateContainerDeploy(containerData, startX, startY, endX, endY, onComplete) {
        const anim = new CraneDeployAnimation(
            containerData,
            startX, startY,
            endX, endY,
            2000, // 2 seconds
            onComplete
        );
        this.animations.push(anim);
        return anim.id;
    }

    /**
     * Animate container removal (crane lifting away)
     */
    animateContainerRemove(containerData, x, y, onComplete) {
        const anim = new CraneLiftAnimation(
            containerData,
            x, y,
            1500, // 1.5 seconds
            onComplete
        );
        this.animations.push(anim);
        return anim.id;
    }

    /**
     * Animate vehicle movement (network traffic)
     */
    animateVehicle(startX, startY, endX, endY, vehicleType, throughput, onComplete) {
        const anim = new VehicleAnimation(
            startX, startY,
            endX, endY,
            vehicleType,
            throughput,
            onComplete
        );
        this.animations.push(anim);
        return anim.id;
    }

    /**
     * Animate container stack growing
     */
    animateStackGrow(containers, x, y, duration, onComplete) {
        const anim = new StackGrowAnimation(
            containers,
            x, y,
            duration,
            onComplete
        );
        this.animations.push(anim);
        return anim.id;
    }

    /**
     * Animate warning light rotating
     */
    animateWarningLight(x, y, color, persistent = true) {
        const anim = new RotatingBeaconAnimation(x, y, color, persistent);
        this.animations.push(anim);
        return anim.id;
    }

    /**
     * Cancel animation by ID
     */
    cancelAnimation(id) {
        this.animations = this.animations.filter(anim => anim.id !== id);
    }

    /**
     * Clear all animations
     */
    clearAll() {
        this.animations = [];
    }

    /**
     * Get next animation ID
     */
    getNextId() {
        return this.animationId++;
    }
}

/**
 * Base Animation class
 */
class Animation {
    constructor(duration, onComplete) {
        this.id = Date.now() + Math.random();
        this.elapsed = 0;
        this.duration = duration;
        this.onComplete = onComplete;
        this.progress = 0;
    }

    update(deltaTime) {
        this.elapsed += deltaTime;
        this.progress = Math.min(this.elapsed / this.duration, 1.0);

        if (this.isComplete() && this.onComplete && !this.completed) {
            this.onComplete();
            this.completed = true;
        }
    }

    isComplete() {
        return this.progress >= 1.0;
    }

    render(ctx) {
        // Override in subclasses
    }

    /**
     * Easing functions
     */
    easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    easeOut(t) {
        return t * (2 - t);
    }

    easeIn(t) {
        return t * t;
    }
}

/**
 * Crane Deploy Animation
 * Simulates crane moving container into position
 */
class CraneDeployAnimation extends Animation {
    constructor(containerData, startX, startY, endX, endY, duration, onComplete) {
        super(duration, onComplete);
        this.containerData = containerData;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;

        // Animation phases
        this.phase = 'move_to'; // move_to, lower, settle
        this.phaseProgress = 0;

        // Crane position
        this.craneX = startX;
        this.craneY = startY - 100;
        this.containerY = startY;
    }

    update(deltaTime) {
        super.update(deltaTime);

        if (this.progress < 0.4) {
            // Phase 1: Move crane to position (0-40%)
            this.phase = 'move_to';
            this.phaseProgress = this.progress / 0.4;
            const eased = this.easeInOut(this.phaseProgress);
            this.craneX = this.startX + (this.endX - this.startX) * eased;
            this.containerY = this.startY;
        } else if (this.progress < 0.9) {
            // Phase 2: Lower container (40-90%)
            this.phase = 'lower';
            this.phaseProgress = (this.progress - 0.4) / 0.5;
            const eased = this.easeOut(this.phaseProgress);
            this.craneX = this.endX;
            this.containerY = this.startY + (this.endY - this.startY) * eased;
        } else {
            // Phase 3: Settle (90-100%)
            this.phase = 'settle';
            this.phaseProgress = (this.progress - 0.9) / 0.1;
            this.craneX = this.endX;
            this.containerY = this.endY;
        }
    }

    render(ctx) {
        ctx.save();

        // Draw crane cable
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.craneX, this.craneY);
        ctx.lineTo(this.craneX, this.containerY - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw crane hook/spreader
        ctx.fillStyle = '#34495e';
        ctx.fillRect(this.craneX - 15, this.containerY - 25, 30, 10);

        // Draw container (simplified)
        ctx.fillStyle = this.phase === 'settle' ? '#2ecc71' : '#f39c12';
        ctx.globalAlpha = 0.8;
        ctx.fillRect(this.craneX - 32, this.containerY - 20, 64, 40);
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.craneX - 32, this.containerY - 20, 64, 40);

        // Draw crane trolley (top part)
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.craneX - 10, this.craneY - 5, 20, 10);

        // Warning light
        if (this.phase !== 'settle') {
            const lightAlpha = (Math.sin(this.elapsed / 100) + 1) / 2;
            ctx.fillStyle = `rgba(241, 196, 15, ${lightAlpha})`;
            ctx.shadowColor = '#f1c40f';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(this.craneX, this.craneY - 10, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

/**
 * Crane Lift Animation
 * Container being removed by crane
 */
class CraneLiftAnimation extends Animation {
    constructor(containerData, x, y, duration, onComplete) {
        super(duration, onComplete);
        this.containerData = containerData;
        this.x = x;
        this.startY = y;
        this.currentY = y;
    }

    update(deltaTime) {
        super.update(deltaTime);
        const eased = this.easeIn(this.progress);
        this.currentY = this.startY - 150 * eased; // Lift up 150px
    }

    render(ctx) {
        ctx.save();
        ctx.globalAlpha = 1.0 - this.progress * 0.5; // Fade as it lifts

        // Cable
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.x, this.currentY - 100);
        ctx.lineTo(this.x, this.currentY - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        // Container
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(this.x - 32, this.currentY - 20, 64, 40);
        ctx.strokeStyle = '#2c3e50';
        ctx.strokeRect(this.x - 32, this.currentY - 20, 64, 40);

        ctx.restore();
    }
}

/**
 * Vehicle Animation
 * Represents network traffic as vehicles
 */
class VehicleAnimation extends Animation {
    constructor(startX, startY, endX, endY, vehicleType, throughput, onComplete) {
        const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const speed = 0.1; // pixels per ms
        const duration = distance / speed;

        super(duration, onComplete);

        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.vehicleType = vehicleType; // 'forklift', 'truck', 'agv'
        this.throughput = throughput;
        this.currentX = startX;
        this.currentY = startY;

        // Vehicle properties
        this.size = this.getVehicleSize(vehicleType);
        this.color = this.getVehicleColor(throughput);
    }

    getVehicleSize(type) {
        switch (type) {
            case 'forklift': return { w: 20, h: 12 };
            case 'truck': return { w: 30, h: 18 };
            case 'agv': return { w: 15, h: 10 };
            default: return { w: 20, h: 12 };
        }
    }

    getVehicleColor(throughput) {
        if (throughput > 1000) return '#2ecc71'; // High throughput = green
        if (throughput > 100) return '#3498db'; // Medium = blue
        return '#95a5a6'; // Low = gray
    }

    update(deltaTime) {
        super.update(deltaTime);
        const eased = this.easeInOut(this.progress);
        this.currentX = this.startX + (this.endX - this.startX) * eased;
        this.currentY = this.startY + (this.endY - this.startY) * eased;
    }

    render(ctx) {
        ctx.save();

        // Calculate angle
        const angle = Math.atan2(this.endY - this.startY, this.endX - this.startX);

        ctx.translate(this.currentX, this.currentY);
        ctx.rotate(angle);

        // Vehicle body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size.w / 2, -this.size.h / 2, this.size.w, this.size.h);

        // Vehicle outline
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.size.w / 2, -this.size.h / 2, this.size.w, this.size.h);

        // Headlights (front)
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(this.size.w / 2 - 2, -this.size.h / 2 + 2, 2, 2);
        ctx.fillRect(this.size.w / 2 - 2, this.size.h / 2 - 4, 2, 2);

        // LED status (top)
        const statusColor = this.throughput > 500 ? '#2ecc71' : '#3498db';
        ctx.fillStyle = statusColor;
        ctx.shadowColor = statusColor;
        ctx.shadowBlur = 5;
        ctx.fillRect(-2, -this.size.h / 2 - 3, 4, 2);

        ctx.restore();
    }
}

/**
 * Stack Grow Animation
 * Containers being added to a stack
 */
class StackGrowAnimation extends Animation {
    constructor(containers, x, y, duration, onComplete) {
        super(duration, onComplete);
        this.containers = containers;
        this.x = x;
        this.y = y;
        this.visibleCount = 0;
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.visibleCount = Math.floor(this.progress * this.containers.length);
    }

    render(ctx) {
        // Render will be handled by the main container renderer
        // This animation just controls the visible count
    }

    getVisibleCount() {
        return this.visibleCount;
    }
}

/**
 * Rotating Beacon Animation
 * Warning light on cranes/nodes
 */
class RotatingBeaconAnimation extends Animation {
    constructor(x, y, color, persistent = true) {
        super(persistent ? Infinity : 3000);
        this.x = x;
        this.y = y;
        this.color = color;
        this.angle = 0;
        this.persistent = persistent;
    }

    update(deltaTime) {
        if (!this.persistent) {
            super.update(deltaTime);
        }
        this.angle += 0.1 * deltaTime / 16;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Beam of light
        const gradient = ctx.createLinearGradient(0, 0, 80, 0);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'transparent');

        ctx.globalAlpha = 0.4;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, -8, 80, 16);

        // Light source
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    isComplete() {
        return this.persistent ? false : super.isComplete();
    }
}
