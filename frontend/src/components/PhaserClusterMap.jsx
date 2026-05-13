import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import ClusterScene from '../phaser/ClusterScene';

/**
 * PhaserClusterMap - React wrapper for Phaser cluster visualization
 *
 * Props:
 * - nodes: Array of node objects with pods
 * - onNodeClick: Callback when node is clicked
 * - onPodClick: Callback when pod is clicked
 */
function PhaserClusterMap({ nodes = [], onNodeClick, onPodClick }) {
  const gameRef = useRef(null);
  const containerRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    // Don't initialize if already exists
    if (gameRef.current) return;

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: '100%',
      height: '100%',
      backgroundColor: '#1a1a2e',
      scene: ClusterScene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      physics: {
        default: false // No physics needed for cluster visualization
      }
    };

    gameRef.current = new Phaser.Game(config);

    // Store scene reference when it's created
    gameRef.current.events.on('ready', () => {
      sceneRef.current = gameRef.current.scene.scenes[0];

      // Pass callbacks to scene
      if (sceneRef.current) {
        sceneRef.current.onNodeClick = onNodeClick;
        sceneRef.current.onPodClick = onPodClick;
      }
    });

    // Cleanup on unmount
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Update cluster data when nodes change
  useEffect(() => {
    if (sceneRef.current && sceneRef.current.updateClusterData) {
      sceneRef.current.updateClusterData({ nodes });
    }
  }, [nodes]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{
        minHeight: '600px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
      }}
    />
  );
}

export default PhaserClusterMap;
