import React from 'react';

interface ColorMagnifierProps {
  x: number;
  y: number;
  color: string;
}

export const ColorMagnifier: React.FC<ColorMagnifierProps> = ({ x, y, color }) => {
  const size = 50;
  const borderSize = 2;
  const offset = 35;

  return (
    <div
      style={{
        position: 'fixed',
        left: x + offset,
        top: y + offset,
        width: size + 'px',
        height: size + 'px',
        backgroundColor: color,
        border: `${borderSize}px solid white`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 1000,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '2px',
          height: '2px',
          backgroundColor: 'rgba(255,255,255,0.8)',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 2px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
};