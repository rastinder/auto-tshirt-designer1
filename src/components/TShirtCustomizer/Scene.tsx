import React, { useEffect, useState } from 'react';
import { Undo2 } from './Undo2'; // Assuming the Undo2 component is in the same directory

interface SceneProps {
  color: string;
  designTexture?: string | null;
  children: React.ReactNode; // Add children prop to the interface
}

export default function Scene({ color, designTexture, children }: SceneProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [designHistory, setDesignHistory] = useState([]); // Add designHistory state

  useEffect(() => {
    if (designTexture) {
      console.log('Scene received design texture:', designTexture.substring(0, 50) + '...');
      setImageLoaded(false); // Reset on new texture
    }
  }, [designTexture]);

  const handleImageLoad = () => {
    console.log('Scene: Image loaded successfully');
    setImageLoaded(true);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Scene: Image failed to load:', e);
    setImageLoaded(false);
  };

  const handleUndo = () => {
    // Implement undo logic here
    console.log('Undo button clicked');
  };

  return (
    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full">
        {/* Undo button */}
        {designHistory.length > 0 && (
          <button
            onClick={handleUndo}
            className="absolute top-4 right-4 z-50 p-2 rounded-full hover:bg-gray-100/10 transition-colors"
            title="Undo last change"
          >
            <Undo2 className="w-6 h-6 text-gray-700 hover:text-gray-900" />
          </button>
        )}
        {designTexture ? (
          <img 
            src={designTexture}
            alt="Generated design preview" 
            className={`w-full h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <p className="text-gray-500">Preview</p>
        )}
        {children}
      </div>
    </div>
  );
}