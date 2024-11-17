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
  onCropComplete?: (croppedImageUrl: string) => void;
  isPickingDesignColor: boolean;
  setIsPickingDesignColor: (isPicking: boolean) => void;
  onDesignColorChange: (color: string, intensity: number) => void;
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
  const [cropStyle, setCropStyle] = useState({
    clip: 'unset',
    width: 0,
    height: 0,
    x: 0,
    y: 0
  });

  // Store last crop dimensions for each image
  const lastCropRef = useRef<{ [key: string]: CropType }>({});

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

  useEffect(() => {
    if (isCropping && designRef.current) {
      const img = designRef.current;
      const imgRect = img.getBoundingClientRect();
      
      if (!crop && onCropChange) {
        // Check if we have a saved crop for this image
        const lastCrop = lastCropRef.current[designTexture];
        
        const initialCrop = lastCrop || {
          unit: 'px',
          x: 0,
          y: 0,
          width: imgRect.width,
          height: imgRect.height
        };
        
        onCropChange(initialCrop);
      }
    }
  }, [isCropping, onCropChange, crop, designSize.width, designSize.height, designTexture]);

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
    const intensity = Math.round((pixel[0] + pixel[1] + pixel[2]) / 3);
    
    setShowColorIndicator(true);
    setTimeout(() => setShowColorIndicator(false), 1000);
    
    onDesignColorChange(color, intensity);
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

  const handleCropComplete = useCallback((crop: CropType, percentCrop: CropType) => {
    if (!crop.width || !crop.height) return;
    
    // Save the crop dimensions for this image
    lastCropRef.current[designTexture] = crop;
    
    setCropStyle({
      clip: 'unset',
      width: crop.width,
      height: crop.height,
      x: crop.x,
      y: crop.y
    });
  }, [designTexture]);

  const handleCropChange = useCallback((newCrop: CropType) => {
    if (onCropChange) {
      onCropChange(newCrop);
    }
  }, [onCropChange]);

  const handleCropDone = useCallback(() => {
    if (crop && cropStyle.width && cropStyle.height && designRef.current) {
      const img = designRef.current;
      const imgRect = img.getBoundingClientRect();
      
      // Calculate the bottom and right insets
      const bottomInset = imgRect.height - (cropStyle.y + cropStyle.height);
      const rightInset = imgRect.width - (cropStyle.x + cropStyle.width);
      
      // Create clip path using the calculated insets
      const clipPath = `inset(${cropStyle.y}px ${rightInset}px ${bottomInset}px ${cropStyle.x}px)`;
      
      setCropStyle(prev => ({
        ...prev,
        clip: clipPath
      }));
      
      // Save the final crop dimensions
      lastCropRef.current[designTexture] = {
        unit: 'px',
        x: cropStyle.x,
        y: cropStyle.y,
        width: cropStyle.width,
        height: cropStyle.height
      };
      
      if (onCropComplete) {
        onCropComplete(designTexture);
      }
    }
  }, [crop, cropStyle, onCropComplete, designTexture]);

  // Cleanup last crop data when component unmounts
  useEffect(() => {
    return () => {
      lastCropRef.current = {};
    };
  }, []);

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
        className={`absolute z-10 ${isCropping ? 'crop-active' : ''}`}
      >
        <div
          style={{
            transform: `scale(${designTransform.scale}) rotate(${designTransform.rotation}deg)`,
            transformOrigin: 'center',
            width: `${designSize.width}px`,
            height: `${designSize.height}px`,
            ...((!isCropping && cropStyle.clip !== 'unset') ? {
              clipPath: cropStyle.clip
            } : {})
          }}
        >
          {isCropping ? (
            <div className="relative">
              <ReactCrop
                crop={crop}
                onChange={handleCropChange}
                onComplete={handleCropComplete}
                className="animate-fade-in"
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
              <button
                onClick={handleCropDone}
                className="absolute bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Apply Crop
              </button>
            </div>
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
              onClick={handleImageColorPick}
              onMouseMove={handleImageMouseMove}
              draggable={false}
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
