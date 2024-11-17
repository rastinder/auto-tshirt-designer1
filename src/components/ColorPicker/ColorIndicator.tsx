import React from 'react';
import './ColorIndicator.css';

interface ColorIndicatorProps {
  x: number;
  y: number;
  color: string;
  isActive: boolean;
}

export const ColorIndicator: React.FC<ColorIndicatorProps> = ({ x, y, color, isActive }) => {
  return (
    <div
      className={`color-indicator ${isActive ? 'active' : ''}`}
      style={{
        backgroundColor: color,
        position: 'fixed',
        left: x,
        top: y,
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: '2px solid white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        pointerEvents: 'none',
        zIndex: 1000,
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
};