// Punto de entrada principal del juego

let game;

/**
 * Inicializa el juego cuando el DOM esté listo
 */
window.addEventListener('DOMContentLoaded', () => {
    console.log('SC Game Mode - Iniciando...');

    try {
        // Crear instancia del juego
        game = new Game('gameCanvas');

        // Iniciar el juego
        game.start();

        console.log('Juego iniciado correctamente!');
        console.log('Controles:');
        console.log('  - WASD o Flechas: Mover personaje');
        console.log('  - Espacio: Detener');
        console.log('  - G: Mostrar/Ocultar grid');
    } catch (error) {
        console.error('Error al iniciar el juego:', error);
    }
});

/**
 * Maneja el evento de cerrar/recargar la página
 */
window.addEventListener('beforeunload', () => {
    if (game) {
        game.stop();
    }
});

/**
 * Maneja errores globales
 */
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
});

/**
 * Previene el scroll con las teclas de flecha
 */
window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }
});
