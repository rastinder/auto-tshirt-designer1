import React, { useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface SceneProps {
  color: string;
  designTexture?: string | null;
  isLoading?: boolean;
  onError?: (error: string) => void;
  children: React.ReactNode;
}

export default function Scene({ 
  color, 
  designTexture, 
  isLoading = false,
  onError,
  children 
}: SceneProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    if (designTexture) {
      console.log('Scene received design texture:', designTexture.substring(0, 50) + '...');
      setImageLoaded(false);
      setRetryCount(0);
    }
  }, [designTexture]);

  const handleImageLoad = () => {
    console.log('Scene: Image loaded successfully');
    setImageLoaded(true);
    setRetryCount(0);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Scene: Image failed to load:', e);
    setImageLoaded(false);
    
    if (retryCount < maxRetries) {
      console.log(`Retrying image load (${retryCount + 1}/${maxRetries})...`);
      setRetryCount(prev => prev + 1);
      // Force image reload by appending timestamp
      const img = e.target as HTMLImageElement;
      if (img.src) {
        img.src = `${img.src}${img.src.includes('?') ? '&' : '?'}t=${Date.now()}`;
      }
    } else {
      onError?.('Failed to load design image. Please try regenerating the design.');
    }
  };

  const handleUndo = () => {
    // Implement undo logic here
    console.log('Undo button clicked');
  };

  return (
    <div className="w-[500px] h-[500px] bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
      <div className="relative w-[400px] h-[400px] flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        
        {/* Undo button */}
        {designTexture && (
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
            alt="T-shirt design"
            className={`w-[400px] h-[400px] object-contain transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <p>Generate a design to see it here</p>
          </div>
        )}
        
        {children}
      </div>
    </div>
  );
}