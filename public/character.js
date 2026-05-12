// Sistema de personaje con movimiento isométrico

class Character {
    constructor(x, y, map) {
        this.x = x; // Posición en el mapa (cartesiana)
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.map = map;
        this.speed = 0.05; // Velocidad de movimiento
        this.color = '#e74c3c'; // Color del personaje
        this.moving = false;

        // Control de teclado
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            up: false,
            down: false,
            left: false,
            right: false,
            space: false
        };

        this.setupControls();
    }

    /**
     * Configura los controles de teclado
     */
    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.handleKeyDown(e.key.toLowerCase());
        });

        window.addEventListener('keyup', (e) => {
            this.handleKeyUp(e.key.toLowerCase());
        });
    }

    /**
     * Maneja las teclas presionadas
     * @param {string} key - Tecla presionada
     */
    handleKeyDown(key) {
        switch (key) {
            case 'w':
            case 'arrowup':
                this.keys.w = true;
                this.keys.up = true;
                break;
            case 'a':
            case 'arrowleft':
                this.keys.a = true;
                this.keys.left = true;
                break;
            case 's':
            case 'arrowdown':
                this.keys.s = true;
                this.keys.down = true;
                break;
            case 'd':
            case 'arrowright':
                this.keys.d = true;
                this.keys.right = true;
                break;
            case ' ':
                this.keys.space = true;
                this.stopMovement();
                break;
        }
    }

    /**
     * Maneja las teclas soltadas
     * @param {string} key - Tecla soltada
     */
    handleKeyUp(key) {
        switch (key) {
            case 'w':
            case 'arrowup':
                this.keys.w = false;
                this.keys.up = false;
                break;
            case 'a':
            case 'arrowleft':
                this.keys.a = false;
                this.keys.left = false;
                break;
            case 's':
            case 'arrowdown':
                this.keys.s = false;
                this.keys.down = false;
                break;
            case 'd':
            case 'arrowright':
                this.keys.d = false;
                this.keys.right = false;
                break;
            case ' ':
                this.keys.space = false;
                break;
        }
    }

    /**
     * Detiene el movimiento del personaje
     */
    stopMovement() {
        this.targetX = Math.round(this.x);
        this.targetY = Math.round(this.y);
        this.moving = false;
    }

    /**
     * Actualiza la posición del personaje
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame
     */
    update(deltaTime) {
        let moveX = 0;
        let moveY = 0;

        // Movimiento isométrico: W/Up mueve arriba-izquierda, S/Down mueve abajo-derecha
        if (this.keys.w || this.keys.up) {
            moveY -= 1; // Arriba en el mapa
        }
        if (this.keys.s || this.keys.down) {
            moveY += 1; // Abajo en el mapa
        }
        if (this.keys.a || this.keys.left) {
            moveX -= 1; // Izquierda en el mapa
        }
        if (this.keys.d || this.keys.right) {
            moveX += 1; // Derecha en el mapa
        }

        // Normalizar movimiento diagonal
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.707; // √2/2 para movimiento diagonal uniforme
            moveY *= 0.707;
        }

        // Aplicar movimiento
        if (moveX !== 0 || moveY !== 0) {
            const newX = this.x + moveX * this.speed * deltaTime;
            const newY = this.y + moveY * this.speed * deltaTime;

            // Verificar colisiones
            const tileX = Math.floor(newX);
            const tileY = Math.floor(newY);

            if (this.map.isWalkable(tileX, tileY)) {
                this.x = newX;
                this.y = newY;
                this.moving = true;
            } else {
                this.moving = false;
            }

            // Mantener dentro de los límites
            this.x = Math.max(0, Math.min(this.map.width - 0.5, this.x));
            this.y = Math.max(0, Math.min(this.map.height - 0.5, this.y));
        } else {
            this.moving = false;
        }
    }

    /**
     * Renderiza el personaje
     * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
     */
    render(ctx) {
        const isoPos = IsoUtils.cartToIso(this.x, this.y);

        IsoUtils.drawCharacter(
            ctx,
            isoPos.x + this.map.offsetX,
            isoPos.y + this.map.offsetY,
            this.color
        );

        // Indicador de posición cuando está en movimiento
        if (this.moving) {
            ctx.save();
            ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
            ctx.beginPath();
            ctx.arc(
                isoPos.x + this.map.offsetX,
                isoPos.y + this.map.offsetY + IsoUtils.TILE_HEIGHT / 2,
                25,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.restore();
        }
    }

    /**
     * Obtiene la posición actual del personaje
     * @returns {Object} {x, y} posición en el mapa
     */
    getPosition() {
        return {
            x: Math.floor(this.x),
            y: Math.floor(this.y)
        };
    }
}
