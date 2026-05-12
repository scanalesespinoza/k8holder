// Utilidades para conversión de coordenadas isométricas

const IsoUtils = {
    // Tamaño de los tiles
    TILE_WIDTH: 64,
    TILE_HEIGHT: 32,

    /**
     * Convierte coordenadas cartesianas a isométricas (para renderizado)
     * @param {number} x - Coordenada X cartesiana
     * @param {number} y - Coordenada Y cartesiana
     * @returns {Object} {x, y} coordenadas isométricas en pantalla
     */
    cartToIso(x, y) {
        return {
            x: (x - y) * (this.TILE_WIDTH / 2),
            y: (x + y) * (this.TILE_HEIGHT / 2)
        };
    },

    /**
     * Convierte coordenadas isométricas a cartesianas (para lógica del juego)
     * @param {number} isoX - Coordenada X isométrica
     * @param {number} isoY - Coordenada Y isométrica
     * @returns {Object} {x, y} coordenadas cartesianas
     */
    isoToCart(isoX, isoY) {
        return {
            x: (isoX / (this.TILE_WIDTH / 2) + isoY / (this.TILE_HEIGHT / 2)) / 2,
            y: (isoY / (this.TILE_HEIGHT / 2) - isoX / (this.TILE_WIDTH / 2)) / 2
        };
    },

    /**
     * Dibuja un tile isométrico
     * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
     * @param {number} x - Posición X en pantalla
     * @param {number} y - Posición Y en pantalla
     * @param {string} color - Color del tile
     */
    drawTile(ctx, x, y, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + this.TILE_WIDTH / 2, y + this.TILE_HEIGHT / 2);
        ctx.lineTo(x, y + this.TILE_HEIGHT);
        ctx.lineTo(x - this.TILE_WIDTH / 2, y + this.TILE_HEIGHT / 2);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();
    },

    /**
     * Dibuja un personaje isométrico simple
     * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
     * @param {number} x - Posición X en pantalla
     * @param {number} y - Posición Y en pantalla
     * @param {string} color - Color del personaje
     */
    drawCharacter(ctx, x, y, color) {
        const size = 20;

        ctx.save();

        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + this.TILE_HEIGHT / 2, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cuerpo
        ctx.fillStyle = color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        // Cabeza
        ctx.beginPath();
        ctx.arc(x, y - size, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cuerpo
        ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size * 1.2);
        ctx.strokeRect(x - size * 0.5, y - size * 0.5, size, size * 1.2);

        ctx.restore();
    }
};
