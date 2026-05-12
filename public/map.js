// Sistema de mapa isométrico

class IsometricMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.offsetX = 400; // Offset para centrar el mapa
        this.offsetY = 100;

        this.generateMap();
    }

    /**
     * Genera un mapa de tiles con diferentes colores
     */
    generateMap() {
        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6'];

        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                // Patrón de tablero de ajedrez con variaciones
                const isEven = (x + y) % 2 === 0;
                const colorIndex = Math.floor((x + y) / 2) % colors.length;

                this.tiles[y][x] = {
                    x: x,
                    y: y,
                    color: isEven ? colors[colorIndex] : this.darkenColor(colors[colorIndex], 20),
                    walkable: true,
                    type: 'ground'
                };
            }
        }
    }

    /**
     * Oscurece un color hexadecimal
     * @param {string} color - Color en formato hex
     * @param {number} percent - Porcentaje de oscurecimiento
     * @returns {string} Color oscurecido
     */
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;

        return '#' + (0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }

    /**
     * Verifica si una posición es caminable
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @returns {boolean} True si es caminable
     */
    isWalkable(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        return this.tiles[y][x].walkable;
    }

    /**
     * Obtiene un tile en una posición
     * @param {number} x - Coordenada X
     * @param {number} y - Coordenada Y
     * @returns {Object|null} Tile o null si está fuera de límites
     */
    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        return this.tiles[y][x];
    }

    /**
     * Renderiza el mapa completo
     * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
     */
    render(ctx) {
        // Renderizar de atrás hacia adelante para el efecto isométrico correcto
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                const isoPos = IsoUtils.cartToIso(x, y);

                IsoUtils.drawTile(
                    ctx,
                    isoPos.x + this.offsetX,
                    isoPos.y + this.offsetY,
                    tile.color
                );
            }
        }
    }

    /**
     * Renderiza una cuadrícula de ayuda
     * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
     */
    renderGrid(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const isoPos = IsoUtils.cartToIso(x, y);

                ctx.beginPath();
                ctx.moveTo(isoPos.x + this.offsetX, isoPos.y + this.offsetY);
                ctx.lineTo(isoPos.x + this.offsetX + IsoUtils.TILE_WIDTH / 2, isoPos.y + this.offsetY + IsoUtils.TILE_HEIGHT / 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(isoPos.x + this.offsetX, isoPos.y + this.offsetY);
                ctx.lineTo(isoPos.x + this.offsetX - IsoUtils.TILE_WIDTH / 2, isoPos.y + this.offsetY + IsoUtils.TILE_HEIGHT / 2);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
}
