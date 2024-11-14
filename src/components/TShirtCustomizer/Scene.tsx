import React, { useEffect, useState } from 'react';

interface SceneProps {
  color: string;
  designTexture?: string | null;
}

export default function Scene({ color, designTexture }: SceneProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

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

  return (
    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
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
    </div>
  );
}