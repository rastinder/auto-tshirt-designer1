import React from 'react';

interface SceneProps {
  color: string;
  texture?: string;
}

export default function Scene({ color, texture }: SceneProps) {
  return (
    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
      {texture ? (
        <img 
          src={texture} 
          alt="Generated design preview" 
          className="w-full h-full object-contain"
        />
      ) : (
        <p className="text-gray-500">Preview</p>
      )}
    </div>
  );
}