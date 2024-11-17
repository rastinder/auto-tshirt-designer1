import React, { useRef, useEffect, useState } from 'react';
import ReactCrop, { Crop as CropType } from 'react-image-crop';
import { DesignTransform } from '../../pages/CustomDesign/types';

interface DraggableDesignProps {
  designTexture: string;
  designTransform: DesignTransform;
  onTransformChange: (transform: DesignTransform) => void;
  isCropping: boolean;
  crop?: CropType;
  onCropChange?: (crop: CropType) => void;
  onCropComplete?: (crop: CropType) => void;
  isPickingDesignColor: boolean;
  onImageColorPick: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export const DraggableDesign: React.FC<DraggableDesignProps> = ({
  designTexture,
  designTransform,
  onTransformChange,
  isCropping,
  crop,
  onCropChange,
  onCropComplete,
  isPickingDesignColor,
  onImageColorPick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const designRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [designSize, setDesignSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (designRef.current) {
      const img = designRef.current;
      img.onload = () => {
        // Calculate base dimensions
        const baseWidth = 200;
        const aspectRatio = img.naturalHeight / img.naturalWidth;
        const newSize = {
          width: baseWidth,
          height: baseWidth * aspectRatio
        };
        setDesignSize(newSize);

        // Center the design in container
        if (containerRef.current && designTransform.position.x === 0 && designTransform.position.y === 0) {
          const containerRect = containerRef.current.getBoundingClientRect();
          onTransformChange({
            ...designTransform,
            position: {
              x: containerRect.width / 2,
              y: containerRect.height / 2
            },
            scale: 1
          });
        }
      };
    }
  }, [designTexture, onTransformChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCropping || isPickingDesignColor) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - designTransform.position.x,
      y: e.clientY - designTransform.position.y
    });
    if (nodeRef.current) {
      nodeRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate new position
    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;

    // Calculate boundaries
    const scaledWidth = designSize.width * designTransform.scale;
    const scaledHeight = designSize.height * designTransform.scale;
    
    // Set minimum and maximum bounds
    const minX = scaledWidth / 2;
    const maxX = containerRect.width - scaledWidth / 2;
    const minY = scaledHeight / 2;
    const maxY = containerRect.height - scaledHeight / 2;

    // Apply boundary constraints
    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));

    onTransformChange({
      ...designTransform,
      position: { x: newX, y: newY }
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (nodeRef.current) {
      nodeRef.current.style.cursor = 'grab';
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 overflow-hidden"
    >
      <div
        ref={nodeRef}
        className="absolute z-10"
        style={{
          position: 'absolute',
          left: `${designTransform.position.x}px`,
          top: `${designTransform.position.y}px`,
          transform: `translate(-50%, -50%)`,
          cursor: isDragging ? 'grabbing' : (isCropping || isPickingDesignColor ? 'default' : 'grab'),
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          touchAction: 'none',
          transformOrigin: 'center'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `scale(${designTransform.scale}) rotate(${designTransform.rotation}deg)`,
            transformOrigin: 'center',
            width: `${designSize.width}px`,
            height: `${designSize.height}px`
          }}
        >
          {isCropping ? (
            <ReactCrop
              crop={crop}
              onChange={onCropChange}
              onComplete={onCropComplete}
            >
              <img
                ref={designRef}
                src={designTexture}
                alt="Design"
                style={{ 
                  width: '100%',
                  height: '100%',
                  cursor: isPickingDesignColor ? 'crosshair' : undefined,
                  display: 'block',
                  objectFit: 'contain'
                }}
                onClick={onImageColorPick}
                draggable={false}
              />
            </ReactCrop>
          ) : (
            <img
              ref={designRef}
              src={designTexture}
              alt="Design"
              style={{ 
                width: '100%',
                height: '100%',
                cursor: isPickingDesignColor ? 'crosshair' : undefined,
                display: 'block',
                objectFit: 'contain'
              }}
              onClick={onImageColorPick}
              draggable={false}
            />
          )}
        </div>
      </div>
    </div>
  );
};
