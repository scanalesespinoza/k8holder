/**
 * Industrial Particle System
 * Creates atmospheric and activity effects for container platform
 */

class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.maxParticles = 500;
    }

    /**
     * Update and render all particles
     */
    update(deltaTime = 16) {
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.alive;
        });

        // Render particles
        this.particles.forEach(particle => particle.render(this.ctx));
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }

    /**
     * Emit industrial smoke from busy nodes
     */
    emitSmoke(x, y, intensity = 1.0) {
        if (this.particles.length >= this.maxParticles) return;

        for (let i = 0; i < intensity * 2; i++) {
            this.particles.push(new SmokeParticle(x, y));
        }
    }

    /**
     * Emit sparks for container deployment/activity
     */
    emitSparks(x, y, count = 10) {
        if (this.particles.length >= this.maxParticles) return;

        for (let i = 0; i < count; i++) {
            this.particles.push(new SparkParticle(x, y));
        }
    }

    /**
     * Emit dust puff (vehicle movement, container placement)
     */
    emitDust(x, y, velocityX = 0, velocityY = 0) {
        if (this.particles.length >= this.maxParticles) return;

        for (let i = 0; i < 5; i++) {
            this.particles.push(new DustParticle(x, y, velocityX, velocityY));
        }
    }

    /**
     * Emit data packet traveling effect
     */
    emitDataPacket(startX, startY, endX, endY, color = '#3498db') {
        if (this.particles.length >= this.maxParticles) return;

        this.particles.push(new DataPacketParticle(startX, startY, endX, endY, color));
    }

    /**
     * Emit steam vent (overheating node)
     */
    emitSteam(x, y, intensity = 1.0) {
        if (this.particles.length >= this.maxParticles) return;

        for (let i = 0; i < intensity; i++) {
            this.particles.push(new SteamParticle(x, y));
        }
    }

    /**
     * Emit error explosion (failed deployment, crash)
     */
    emitErrorExplosion(x, y) {
        if (this.particles.length >= this.maxParticles) return;

        // Red sparks
        for (let i = 0; i < 20; i++) {
            this.particles.push(new SparkParticle(x, y, '#e74c3c'));
        }

        // Smoke
        for (let i = 0; i < 10; i++) {
            this.particles.push(new SmokeParticle(x, y, '#7f8c8d'));
        }
    }

    /**
     * Create ambient fog particles
     */
    createAmbientFog(bounds, density = 20) {
        for (let i = 0; i < density; i++) {
            const x = bounds.x + Math.random() * bounds.width;
            const y = bounds.y + Math.random() * bounds.height;
            this.particles.push(new FogParticle(x, y, bounds));
        }
    }
}

/**
 * Base Particle class
 */
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.life = 1.0;
        this.maxLife = 1.0;
        this.alive = true;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime / 16;
        this.y += this.vy * deltaTime / 16;
        this.life -= deltaTime / (this.maxLife * 1000);
        if (this.life <= 0) this.alive = false;
    }

    render(ctx) {
        // Override in subclasses
    }
}

/**
 * Smoke Particle - Rising smoke from activity
 */
class SmokeParticle extends Particle {
    constructor(x, y, color = '#95a5a6') {
        super(x, y);
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = -0.5 - Math.random() * 0.5; // Rise up
        this.size = 8 + Math.random() * 12;
        this.maxLife = 3.0;
        this.life = 1.0;
        this.color = color;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.size += 0.2; // Expand as it rises
        this.rotation += this.rotationSpeed;
        this.vy *= 0.98; // Slow down
    }

    render(ctx) {
        const alpha = this.life * 0.4;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Spark Particle - Welding/activity sparks
 */
class SparkParticle extends Particle {
    constructor(x, y, color = '#f39c12') {
        super(x, y);
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 1; // Slight upward bias
        this.gravity = 0.15;
        this.size = 2 + Math.random() * 2;
        this.maxLife = 0.8;
        this.life = 1.0;
        this.color = color;
        this.trail = [];
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.vy += this.gravity;

        // Add trail point
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 5) this.trail.shift();
    }

    render(ctx) {
        const alpha = this.life;

        // Draw trail
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        this.trail.forEach((point, i) => {
            if (i === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();

        // Draw spark
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Dust Particle - Ground dust from movement
 */
class DustParticle extends Particle {
    constructor(x, y, vx = 0, vy = 0) {
        super(x, y);
        this.vx = vx + (Math.random() - 0.5) * 0.5;
        this.vy = vy - Math.random() * 0.3;
        this.size = 3 + Math.random() * 5;
        this.maxLife = 1.0;
        this.life = 1.0;
        this.color = '#bdc3c7';
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.vx *= 0.95; // Friction
        this.vy *= 0.95;
    }

    render(ctx) {
        const alpha = this.life * 0.3;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Data Packet Particle - Network traffic visualization
 */
class DataPacketParticle extends Particle {
    constructor(startX, startY, endX, endY, color) {
        super(startX, startY);
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.progress = 0;
        this.speed = 0.02; // 0-1 over time
        this.size = 4;
        this.color = color;
        this.maxLife = 2.0;
        this.life = 1.0;
    }

    update(deltaTime) {
        this.progress += this.speed * deltaTime / 16;
        if (this.progress >= 1.0) {
            this.alive = false;
        }

        // Interpolate position
        this.x = this.startX + (this.endX - this.startX) * this.progress;
        this.y = this.startY + (this.endY - this.startY) * this.progress;
    }

    render(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;

        // Draw packet as glowing orb
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/**
 * Steam Particle - Overheating effect
 */
class SteamParticle extends Particle {
    constructor(x, y) {
        super(x, y);
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = -1 - Math.random() * 0.5; // Fast upward
        this.size = 10 + Math.random() * 15;
        this.maxLife = 2.0;
        this.life = 1.0;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.08;
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.size += 0.3; // Expand quickly
        this.rotation += this.rotationSpeed;
        this.vy *= 0.96;
    }

    render(ctx) {
        const alpha = this.life * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ecf0f1';
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Fog Particle - Ambient atmosphere
 */
class FogParticle extends Particle {
    constructor(x, y, bounds) {
        super(x, y);
        this.vx = (Math.random() - 0.5) * 0.1;
        this.vy = (Math.random() - 0.5) * 0.05;
        this.size = 40 + Math.random() * 80;
        this.maxLife = Infinity; // Persistent
        this.life = 0.5 + Math.random() * 0.3;
        this.bounds = bounds;
        this.opacity = 0.02 + Math.random() * 0.03;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime / 16;
        this.y += this.vy * deltaTime / 16;

        // Wrap around bounds
        if (this.x < this.bounds.x) this.x = this.bounds.x + this.bounds.width;
        if (this.x > this.bounds.x + this.bounds.width) this.x = this.bounds.x;
        if (this.y < this.bounds.y) this.y = this.bounds.y + this.bounds.height;
        if (this.y > this.bounds.y + this.bounds.height) this.y = this.bounds.y;
    }

    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Warning Light Particle - Rotating beacon on cranes/nodes
 */
class WarningLightParticle extends Particle {
    constructor(x, y, color = '#f39c12') {
        super(x, y);
        this.color = color;
        this.angle = 0;
        this.rotationSpeed = 0.1;
        this.maxLife = Infinity; // Persistent
        this.life = 1.0;
        this.intensity = 0;
    }

    update(deltaTime) {
        this.angle += this.rotationSpeed * deltaTime / 16;
        this.intensity = (Math.sin(this.angle * 2) + 1) / 2; // Pulse
    }

    render(ctx) {
        ctx.save();

        // Beam of light rotating
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 100);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'transparent');

        ctx.globalAlpha = this.intensity * 0.3;
        ctx.fillStyle = gradient;
        ctx.fillRect(-100, -10, 100, 20);

        // Light source
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
