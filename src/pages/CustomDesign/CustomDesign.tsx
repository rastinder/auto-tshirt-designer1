// CustomDesign.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Crop, AlertCircle, Loader2, Undo2 } from 'lucide-react';
import { ColorPicker } from '../../components/TShirtCustomizer/ColorPicker';
import { SizeSelector } from '../../components/TShirtCustomizer/SizeSelector';
import { PromptInput } from '../../components/TShirtCustomizer/PromptInput';
import ReactCrop, { Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { removeBackground } from '../../services/backgroundRemoval';
import { 
  checkLocalServer, 
  loadPreviousDesigns, 
  saveDesignToHistory, 
  handleGenerateDesign, 
  handleBackgroundToggle, 
  handleTransparencyChange, 
  updateDesignWithHistory 
} from './api';

interface DesignTransform {
  hasBackground: boolean;
  texture: string | null;
  rotation: number;
  scale: number;
  position: { x: number; y: number };
}

export default function CustomDesign() {
  const [color, setColor] = useState('#ffffff');
  const [size, setSize] = useState('M');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [designTexture, setDesignTexture] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [transparency, setTransparency] = useState(0);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [designTransform, setDesignTransform] = useState<DesignTransform>({
    hasBackground: true,
    texture: null,
    rotation: 0,
    scale: 1,
    position: { x: 0, y: 0 },
  });
  const [previousDesigns, setPreviousDesigns] = useState<string[]>([]);
  const [designHistory, setDesignHistory] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [viewMode, setViewMode] = useState('hanging');
  const [crop, setCrop] = useState<CropType>({
    unit: '%',
    x: 0,
    y: 0,
    width: 100,
    height: 100
  });

  const designRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartPosition = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const tshirtViews = {
    hanging: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_red:0/e_blue:0/e_green:0/l_hanging-shirt-texture,o_0,fl_relative,w_1.0/l_Hanger_qa2diz,fl_relative,w_1.0/Hanging_T-Shirt_v83je9.jpg",
    laying: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_red:0/e_blue:0/e_green:0/l_laying-shirt-texture,o_0,fl_relative,w_1.0/laying-shirt_xqstgr.jpg",
    model: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_red:0/e_blue:0/e_green:0/u_model2,fl_relative,w_1.0/l_heather_texture,o_0,fl_relative,w_1.0/shirt_only.jpg"
  };

  const getColorAdjustedImage = (imageUrl: string, color: string) => {
    const hexColor = color.replace('#', '');
    return imageUrl.replace(/e_red:0\/e_blue:0\/e_green:0/, `e_replace_color:${hexColor}:60:white`);
  };

  useEffect(() => {
    checkLocalServer();
  }, []);

  useEffect(() => {
    return () => {
      setIsGenerating(false);
      setTaskId(null);
    };
  }, []);

  useEffect(() => {
    loadPreviousDesigns(setPreviousDesigns, setIsLoadingHistory);
  }, []);

  const handleRetry = () => {
    if (taskId) {
      setError('');
      setIsGenerating(true);
      setRetryCount(0);
      // You will need to implement a function to retry the design generation
      // This is not included in the api.ts file, so you can keep it here or move it to api.ts
    }
  };

  const handleRestore = () => {
    setDesignTransform(prev => ({
      ...prev,
      scale: 1,
      rotation: 0
    }));
  };

  const handleCropComplete = (crop: CropType, percentCrop: CropType) => {
    if (imageRef.current && crop.width && crop.height) {
      const canvas = document.createElement('canvas');
      const image = imageRef.current;
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = crop.width * scaleX;
      canvas.height = crop.height * scaleY;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          image,
          crop.x * scaleX,
          crop.y * scaleY,
          crop.width * scaleX,
          crop.height * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
        );

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            updateDesignWithHistory(setDesignHistory, setDesignTexture, designTexture, url);
            setIsCropping(false);
          }
        });
      }
    }
  };

  const handleUndo = () => {
    if (designHistory.length > 0) {
      const previousState = designHistory[designHistory.length - 1];
      const newHistory = designHistory.slice(0, -1);
      setDesignHistory(newHistory);
      setDesignTexture(previousState);
    }
  };

  const handleColorPick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isPickingColor || !designRef.current) return;

    const rect = designRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = e.target as HTMLImageElement;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const pixel = ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
    const hexColor = '#' + [pixel[0], pixel[1], pixel[2]]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');

    setSelectedColor(hexColor);
    setIsPickingColor(false);
    handleTransparencyChange(designTexture, selectedColor, transparency, setIsLoading, setError, setDesignTexture);
  };

  const handleReset = () => {
    setSelectedColor('#000000');
    setTransparency(0);
    setIsPickingColor(false);
  };

  const handleImageReset = () => {
    if (designTexture) {
      setTransparency(0);
      setSelectedColor('#000000');
      setIsPickingColor(false);
      setDesignTransform({
        ...designTransform,
        hasBackground: true,
        scale: 1,
        rotation: 0,
        position: { x: 0, y: 0 }
      });
    }
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (designRef.current) {
      const rect = designRef.current.getBoundingClientRect();
      dragStartPosition.current = { x: e.clientX, y: e.clientY };
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      isDragging.current = true;
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }
  };

  const handleDragMove = (e: MouseEvent) => {
    if (isDragging.current && designRef.current) {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      setDesignTransform(prev => ({
        ...prev,
        position: { x: newX, y: newY }
      }));
    }
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  const handleAddToCart = () => {
    if (!designTexture) {
      setError('Please create a design first');
      return;
    }
    const cartItem = {
      design: designTexture,
      color: color,
      size: size,
      timestamp: new Date().toISOString()
    };
    console.log('Adding to cart:', cartItem);
    alert('Added to cart successfully!');
  };

  const handleGenerate = async (prompt: string) => {
    await handleGenerateDesign(
      prompt,
      color,
      setTaskId,
      setError,
      setIsGenerating,
      setDesignTransform,
      setDesignTexture,
      setRetryCount,
      saveDesignToHistory,
      (newDesign: string | null) => {
        updateDesignWithHistory(setDesignHistory, setDesignTexture, designTexture, newDesign);
        setIsGenerating(false); // Ensure we reset the generating state
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-7xl">
      <Helmet>
        <title>Custom T-Shirt Design - AI Generated</title>
      </Helmet>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col space-y-3">
          <div className="relative aspect-square bg-white rounded-lg overflow-hidden shadow-lg">
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={getColorAdjustedImage(tshirtViews[viewMode], color)}
                alt={`T-shirt ${viewMode} view`}
                className="w-full h-full object-contain"
              />

              {designTexture && !isCropping && (
                <div
                  ref={designRef}
                  className="absolute"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) translate(${designTransform.position.x}px, ${designTransform.position.y}px)`,
                    transformOrigin: 'center center',
                  }}
                >
                  <div
                    className="relative w-full h-full flex items-center justify-center"
                    style={{
                      transform: `rotate(${designTransform.rotation}deg) scale(${designTransform.scale})`,
                      transition: 'transform 0.1s ease',
                    }}
                  >
                    <img
                      src={designTexture}
                      alt="Design"
                      className={`w-auto h-auto max-w-[200px] max-h-[200px] object-contain ${isPickingColor ? 'cursor-crosshair' : ''}`}
                      onClick={handleColorPick}
                      onError={(e) => {
                        console.error('Failed to load design image');
                        setError('Failed to load the design image. Please try again.');
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Design Controls */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex flex-wrap items-center gap-2">
                    {/* Rotation Controls */}
                    <div className="flex items-center bg-white rounded-lg shadow-sm py-0.5 px-1 select-none gap-1">
                      <button
                        onClick={() => setDesignTransform(prev => ({
                          ...prev,
                          rotation: prev.rotation - 5
                        }))}
                        className="text-gray-700 hover:text-blue-500 px-0.5 text-xs"
                      >
                        ↺
                      </button>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={designTransform.rotation}
                        onChange={(e) => setDesignTransform(prev => ({
                          ...prev,
                          rotation: parseInt(e.target.value)
                        }))}
                        className="w-32 mx-0.5 h-0.5"
                        style={{
                          WebkitAppearance: 'none',
                          appearance: 'none',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '9999px',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      />
                      <button
                        onClick={() => setDesignTransform(prev => ({
                          ...prev,
                          rotation: prev.rotation + 5
                        }))}
                        className="text-gray-700 hover:text-blue-500 px-0.5 text-xs"
                      >
                        ↻
                      </button>
                    </div>

                    {/* Utility Buttons */}
                    <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm py-0.5 px-1">
                      <button
                        onClick={() => setIsCropping(!isCropping)}
                        className="flex items-center px-2 py-1 text-sm text-blue-700 hover:bg-blue-50 rounded"
                        title={isCropping ? 'Cancel Crop' : 'Crop Design'}
                      >
                        <Crop className="w-4 h-4 mr-1" />
                        {isCropping ? 'Cancel' : 'Crop'}
                      </button>

                      <button
                        onClick={() => handleBackgroundToggle(designTexture, isLoading, setIsLoading, setDesignTexture, setDesignTransform, setError)}
                        disabled={isLoading}
                        className={`flex items-center px-2 py-1 text-sm text-blue-700 hover:bg-blue-50 rounded ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={designTransform.hasBackground ? "Remove background" : "Background removed"}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20.9991 12C20.9991 16.9706 16.9697 21 11.9991 21C7.02848 21 2.99908 16.9706 2.99908 12C2.99908 7.02944 7.02848 3 11.9991 3C16.9697 3 20.9991 7.02944 20.9991 12Z" stroke="currentColor" strokeWidth="2"/>
                            <path d="M2.99908 12H4.99908M18.9991 12H20.9991M11.9991 4V2M11.9991 22V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        )}
                        {designTransform.hasBackground ? "Remove BG" : "No BG"}
                      </button>

                      <button
                        onClick={() => setIsPickingColor(!isPickingColor)}
                        className={`flex items-center px-2 py-1 text-sm text-blue-700 hover:bg-blue-50 rounded ${isPickingColor ? 'bg-blue-50' : ''}`}
                        title="Pick color for transparency"
                      >
                        <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M7 7h10v10H7z" />
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Color
                      </button>

                      {selectedColor && (
                        <>
                          <div
                            className="w-4 h-4 rounded border border-gray-300"
                            style={{ backgroundColor: selectedColor }}
                          />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={transparency}
                            onChange={(e) => setTransparency(parseInt(e.target.value))}
                            className="w-24 h-1.5"
                            style={{
                              WebkitAppearance: 'none',
                              appearance: 'none',
                              backgroundColor: '#e5e7eb',
                              borderRadius: '9999px',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          />
                          <span className="text-xs text-gray-600">{transparency}%</span>
                        </>
                      )}

                      <button
                        onClick={handleReset}
                        className="flex items-center px-2 py-1 text-sm text-blue-700 hover:bg-blue-50 rounded"
                        title="Reset all changes"
                      >
                        <Undo2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {previousDesigns.length > 0 && (
                <div className="absolute right-4 top-4 flex flex-col gap-2 z-50">
                  {previousDesigns.map((design, index) => (
                    <button
                      key={index}
                      onClick={() => updateDesignWithHistory(setDesignHistory, setDesignTexture, designTexture, design)}
                      className="w-12 h-12 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-500 overflow-hidden shadow-md transition-transform hover:scale-110 focus:outline-none focus:border-blue-500"
                      title={`Previous design ${index + 1}`}
                    >
                      <img
                        src={design}
                        alt={`Previous design ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}

              {designTexture && isCropping && (
                <div className="absolute inset-0 bg-white">
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={handleCropComplete}
                  >
                    <img
                      ref={imageRef}
                      src={designTexture}
                      alt="Crop design"
                      className="w-full h-full object-contain"
                    />
                  </ReactCrop>
                </div>
              )}
            </div>

            <div className="flex justify-center space-x-3 mt-4">
              {Object.entries(tshirtViews).map(([view, url]) => (
                <button
                  key={view}
                  onClick={() => setViewMode(view as keyof typeof tshirtViews)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
                    viewMode === view ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={getColorAdjustedImage(url, color)}
                    alt={`${view} view`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-4">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h1 className="text-3xl font-bold mb-6">Customize Your T-Shirt</h1>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Select Color</h3>
                <ColorPicker color={color} onChange={setColor} />
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Select Size</h3>
                <SizeSelector size={size} onChange={setSize} />
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Design Generation</h3>
                <PromptInput onGenerate={handleGenerate} isGenerating={isGenerating} />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleAddToCart}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center gap-2"
                disabled={!designTexture || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Add to Cart'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}