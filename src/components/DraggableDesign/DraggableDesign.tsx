import React, { useRef, useEffect, useState, useCallback } from 'react';
import ReactCrop, { Crop as CropType } from 'react-image-crop';
import { DesignTransform } from '../../pages/CustomDesign/types';
import { ColorMagnifier } from '../ColorPicker/ColorMagnifier';
import { ColorIndicator } from '../ColorPicker/ColorIndicator';

interface DraggableDesignProps {
  designTexture: string;
  designTransform: DesignTransform;
  onTransformChange: (transform: DesignTransform) => void;
  isCropping: boolean;
  crop?: CropType;
  onCropChange?: (crop: CropType) => void;
  onCropComplete?: (crop: CropType) => void;
  isPickingDesignColor: boolean;
  setIsPickingDesignColor: (isPicking: boolean) => void;
  onDesignColorChange: (color: string) => void;
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
  setIsPickingDesignColor,
  onDesignColorChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const designRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [designSize, setDesignSize] = useState({ width: 0, height: 0 });
  const [previewColor, setPreviewColor] = useState<string>('#000000');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [indicatorPosition, setIndicatorPosition] = useState({ x: 0, y: 0 });
  const [showColorIndicator, setShowColorIndicator] = useState(false);

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
            }
          });
        }
      };
    }
  }, [designTexture]);

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
    if (!isDragging || isCropping || isPickingDesignColor) return;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Calculate the new position
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Calculate the design's dimensions with scale
    const scaledWidth = designSize.width * designTransform.scale;
    const scaledHeight = designSize.height * designTransform.scale;

    // Calculate boundaries to keep design fully inside
    const minX = scaledWidth / 2;  // Left boundary
    const maxX = containerRect.width - scaledWidth / 2;  // Right boundary
    const minY = scaledHeight / 2;  // Top boundary
    const maxY = containerRect.height - scaledHeight / 2;  // Bottom boundary

    // Constrain the position to keep design fully inside
    const constrainedX = Math.max(minX, Math.min(maxX, newX));
    const constrainedY = Math.max(minY, Math.min(maxY, newY));

    onTransformChange({
      ...designTransform,
      position: {
        x: constrainedX,
        y: constrainedY
      }
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (nodeRef.current) {
      nodeRef.current.style.cursor = 'grab';
    }
  };

  const handleImageColorPick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!designRef.current || !isPickingDesignColor) return;

    const img = designRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIndicatorPosition({ x: e.clientX, y: e.clientY });
    
    // Scale coordinates to actual image dimensions
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const actualX = Math.floor(x * scaleX);
    const actualY = Math.floor(y * scaleY);

    // Get pixel color
    const pixel = ctx.getImageData(actualX, actualY, 1, 1).data;
    const color = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
    
    setShowColorIndicator(true);
    setTimeout(() => setShowColorIndicator(false), 1000);
    
    onDesignColorChange(color);
    setIsPickingDesignColor(false);
  }, [isPickingDesignColor, onDesignColorChange, setIsPickingDesignColor]);

  const handleImageMouseMove = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!designRef.current || !isPickingDesignColor) return;

    const img = designRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x: e.clientX, y: e.clientY });

    // Scale coordinates to actual image dimensions
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const actualX = Math.floor(x * scaleX);
    const actualY = Math.floor(y * scaleY);

    // Get pixel color
    const pixel = ctx.getImageData(actualX, actualY, 1, 1).data;
    const color = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
    
    setPreviewColor(color);
  }, [isPickingDesignColor]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 overflow-hidden"
    >
      <div
        ref={nodeRef}
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
        className="absolute z-10"
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
                onClick={handleImageColorPick}
                onMouseMove={handleImageMouseMove}
                draggable={false}
              />
            </ReactCrop>
          ) : (
            <img
              ref={designRef}
              src={designTexture}
              alt="Design"
              draggable={false}
              style={{ 
                width: '100%',
                height: '100%',
                cursor: isPickingDesignColor ? 'crosshair' : undefined,
                display: 'block',
                objectFit: 'contain'
              }}
              onClick={handleImageColorPick}
              onMouseMove={handleImageMouseMove}
            />
          )}
        </div>
      </div>
      {isPickingDesignColor && (
        <ColorMagnifier
          x={mousePosition.x}
          y={mousePosition.y}
          color={previewColor}
        />
      )}
      {showColorIndicator && (
        <ColorIndicator
          x={indicatorPosition.x}
          y={indicatorPosition.y}
          color={previewColor}
          isActive={true}
        />
      )}
    </div>
  );
};
