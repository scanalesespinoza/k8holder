// Motor principal del juego

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Configurar canvas
        this.canvas.width = 800;
        this.canvas.height = 600;

        // Configurar el mapa
        this.map = new IsometricMap(10, 10);

        // Crear personaje en el centro del mapa
        this.character = new Character(5, 5, this.map);

        // Control de tiempo
        this.lastTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTime = 0;

        // Estado del juego
        this.running = false;
        this.showGrid = false;

        // Elementos UI
        this.posXElement = document.getElementById('pos-x');
        this.posYElement = document.getElementById('pos-y');
        this.fpsElement = document.getElementById('fps');

        this.setupDebugControls();
    }

    /**
     * Configura controles de debug
     */
    setupDebugControls() {
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'g') {
                this.showGrid = !this.showGrid;
            }
        });
    }

    /**
     * Inicia el loop del juego
     */
    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    /**
     * Detiene el juego
     */
    stop() {
        this.running = false;
    }

    /**
     * Loop principal del juego
     */
    gameLoop(currentTime = 0) {
        if (!this.running) return;

        // Calcular delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Actualizar FPS
        this.updateFPS(deltaTime);

        // Actualizar
        this.update(deltaTime);

        // Renderizar
        this.render();

        // Siguiente frame
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Actualiza el contador de FPS
     * @param {number} deltaTime - Tiempo transcurrido
     */
    updateFPS(deltaTime) {
        this.frameCount++;
        this.fpsTime += deltaTime;

        if (this.fpsTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTime = 0;
        }
    }

    /**
     * Actualiza la lógica del juego
     * @param {number} deltaTime - Tiempo transcurrido desde el último frame
     */
    update(deltaTime) {
        // Actualizar personaje
        this.character.update(deltaTime);

        // Actualizar UI
        this.updateUI();
    }

    /**
     * Actualiza la interfaz de usuario
     */
    updateUI() {
        const pos = this.character.getPosition();
        this.posXElement.textContent = pos.x;
        this.posYElement.textContent = pos.y;
        this.fpsElement.textContent = this.fps;
    }

    /**
     * Renderiza todo el juego
     */
    render() {
        // Limpiar canvas
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Renderizar mapa
        this.map.render(this.ctx);

        // Renderizar grid si está activado
        if (this.showGrid) {
            this.map.renderGrid(this.ctx);
        }

        // Renderizar personaje
        this.character.render(this.ctx);

        // Renderizar info de debug
        this.renderDebugInfo();
    }

    /**
     * Renderiza información de debug
     */
    renderDebugInfo() {
        this.ctx.save();
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Presiona 'G' para mostrar/ocultar grid`, 10, 20);
        this.ctx.fillText(`FPS: ${this.fps}`, 10, 40);

        const pos = this.character.getPosition();
        this.ctx.fillText(`Pos: (${pos.x}, ${pos.y})`, 10, 60);
        this.ctx.fillText(`Estado: ${this.character.moving ? 'Moviendo' : 'Quieto'}`, 10, 80);

        this.ctx.restore();
    }

    /**
     * Maneja el redimensionamiento de la ventana
     */
    handleResize() {
        // Aquí puedes agregar lógica para redimensionar el canvas si es necesario
    }
}
