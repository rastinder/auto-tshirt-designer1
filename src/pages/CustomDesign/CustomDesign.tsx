// CustomDesign.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Crop, AlertCircle, Loader2, Undo2, RotateCcw } from 'lucide-react';
import { ColorPicker } from '../../components/TShirtCustomizer/ColorPicker';
import { SizeSelector } from '../../components/TShirtCustomizer/SizeSelector';
import { PromptInput } from '../../components/TShirtCustomizer/PromptInput';
import ReactCrop, { Crop as CropType } from 'react-image-crop';
import Draggable from 'react-draggable';
import 'react-image-crop/dist/ReactCrop.css';
import { 
  checkLocalServer, 
  loadPreviousDesigns, 
  saveDesignToHistory, 
  handleGenerateDesign,
  removeBackground,
  applyTransparency,
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
    model: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_red:0/e_blue:0/e_green:0/u_model2,fl_relative,w_1.0/l_heather_texture,o_0,fl_relative,w_1.0/shirt_only.jpg",
    front: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_red:0/e_blue:0/e_green:0/l_front-shirt-texture,o_0,fl_relative,w_1.0/front-shirt_xqstgr.jpg",
    back: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_red:0/e_blue:0/e_green:0/l_back-shirt-texture,o_0,fl_relative,w_1.0/back-shirt_xqstgr.jpg",
    left: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_red:0/e_blue:0/e_green:0/l_left-shirt-texture,o_0,fl_relative,w_1.0/left-shirt_xqstgr.jpg",
    right: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_red:0/e_blue:0/e_green:0/l_right-shirt-texture,o_0,fl_relative,w_1.0/right-shirt_xqstgr.jpg"
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
    handleTransparencyChange();
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

  const handleBackgroundToggle = async () => {
    if (!designTexture || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const processedImageUrl = await removeBackground(designTexture);
      setDesignTexture(processedImageUrl);
      setDesignTransform(prev => ({
        ...prev,
        hasBackground: false
      }));
    } catch (error) {
      console.error('Background removal failed:', error);
      setError('Failed to remove background. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransparencyChange = async () => {
    if (!designTexture || !selectedColor) return;

    setIsLoading(true);
    setError(null);

    try {
      const processedImageUrl = await applyTransparency(designTexture, selectedColor, transparency);
      setDesignTexture(processedImageUrl);
    } catch (error) {
      console.error('Failed to apply transparency:', error);
      setError('Failed to apply transparency. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-7xl">
      <Helmet>
        <title>Custom T-Shirt Design - AI Generated</title>
      </Helmet>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col space-y-3">
          <div className="relative w-full h-[600px] bg-gray-50 rounded-lg shadow-inner overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={getColorAdjustedImage(tshirtViews[viewMode as keyof typeof tshirtViews], color)}
                alt={`T-shirt ${viewMode} view`}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Design overlay */}
            {designTexture && (
              <Draggable
                onStart={() => {
                  isDragging.current = true;
                  if (designRef.current) {
                    const rect = designRef.current.getBoundingClientRect();
                    dragStartPosition.current = {
                      x: rect.left,
                      y: rect.top
                    };
                  }
                }}
                onStop={() => {
                  isDragging.current = false;
                  if (designRef.current) {
                    const rect = designRef.current.getBoundingClientRect();
                    dragOffset.current = {
                      x: rect.left - dragStartPosition.current.x,
                      y: rect.top - dragStartPosition.current.y
                    };
                  }
                }}
              >
                <div
                  ref={designRef}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-move"
                  style={{
                    transform: `translate(-50%, -50%) scale(${designTransform.scale}) rotate(${designTransform.rotation}deg)`,
                    maxWidth: '80%',
                    maxHeight: '80%',
                  }}
                >
                  <img
                    src={designTexture}
                    alt="Design"
                    className="max-w-full max-h-full"
                    style={{
                      filter: `opacity(${100 - transparency}%)`,
                    }}
                  />
                </div>
              </Draggable>
            )}

            {/* Previous Designs Gallery */}
            {previousDesigns.length > 0 && (
              <div className="absolute right-4 top-4 w-[90px] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="text-xs text-gray-600 font-medium text-center">History</div>
                </div>
                <div className="p-2 flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  {previousDesigns.slice(-4).map((design, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setDesignTexture(design);
                        saveDesignToHistory(design, setDesignHistory);
                      }}
                      className="relative w-[70px] h-[70px] mx-auto bg-white rounded-lg border border-gray-200 hover:border-blue-500 overflow-hidden shadow-sm transition-all hover:scale-105 focus:outline-none focus:border-blue-500 group"
                      title={`Load previous design ${previousDesigns.length - index}`}
                    >
                      <img
                        src={design}
                        alt={`Previous design ${previousDesigns.length - index}`}
                        className="w-full h-full object-contain p-1"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                      <div className="absolute bottom-0 left-0 right-0 text-[10px] text-center bg-black/50 text-white py-0.5">
                        #{previousDesigns.length - index}
                      </div>
                    </button>
                  ))}
                  {isLoadingHistory && (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Design Controls */}
          {designTexture && (
            <div className="mt-4 bg-white rounded-lg shadow-sm">
              {/* Quick Actions */}
              <div className="p-3 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsCropping(!isCropping)}
                    className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-all ${
                      isCropping 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                    title={isCropping ? 'Cancel Crop' : 'Crop Design'}
                  >
                    <Crop className="w-4 h-4 mr-1.5" />
                    {isCropping ? 'Cancel' : 'Crop'}
                  </button>

                  <button
                    onClick={handleBackgroundToggle}
                    disabled={isLoading}
                    className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-all ${
                      designTransform.hasBackground 
                        ? 'text-gray-700 hover:bg-gray-50 border border-gray-200' 
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={designTransform.hasBackground ? "Remove background" : "Background removed"}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20.9991 12C20.9991 16.9706 16.9697 21 11.9991 21C7.02848 21 2.99908 16.9706 2.99908 12C2.99908 7.02944 7.02848 3 11.9991 3C16.9697 3 20.9991 7.02944 20.9991 12Z" stroke="currentColor" strokeWidth="2"/>
                          <path d="M2.99908 12H4.99908M18.9991 12H20.9991M11.9991 4V2M11.9991 22V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        {designTransform.hasBackground ? "Remove BG" : "BG Removed"}
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setIsPickingColor(!isPickingColor)}
                    className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-all ${
                      isPickingColor 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                    title="Pick color for transparency"
                  >
                    <svg
                      className="w-4 h-4 mr-1.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2v20M2 12h20" />
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 12h.01" />
                    </svg>
                    Color
                  </button>

                  <button
                    onClick={async () => {
                      if (!designTexture || isLoading) return;
                      const timestamp = new Date().getTime();
                      const newUrl = designTexture.includes('?') 
                        ? `${designTexture}&t=${timestamp}`
                        : `${designTexture}?t=${timestamp}`;
                      setDesignTexture(newUrl);
                    }}
                    className="flex items-center px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200 transition-all"
                    title="Reload design"
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    Reload
                  </button>

                  <button
                    onClick={handleReset}
                    className="flex items-center px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200 transition-all"
                    title="Reset all changes"
                  >
                    <Undo2 className="w-4 h-4 mr-1.5" />
                    Reset
                  </button>
                </div>

                {selectedColor && (
                  <div className="flex items-center gap-3 mt-3">
                    <div
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: selectedColor }}
                    />
                    <div className="flex-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={transparency}
                        onChange={(e) => setTransparency(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <span className="text-sm text-gray-600 min-w-[40px] text-right">{transparency}%</span>
                  </div>
                )}
              </div>

              {/* Transform Controls */}
              <div className="p-3">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Size</label>
                      <span className="text-sm text-gray-500">{Math.round(designTransform.scale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={designTransform.scale * 100}
                      onChange={(e) => {
                        const newScale = parseInt(e.target.value) / 100;
                        setDesignTransform(prev => ({
                          ...prev,
                          scale: newScale
                        }));
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Rotation</label>
                      <span className="text-sm text-gray-500">{designTransform.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={designTransform.rotation}
                      onChange={(e) => {
                        const newRotation = parseInt(e.target.value);
                        setDesignTransform(prev => ({
                          ...prev,
                          rotation: newRotation
                        }));
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-medium text-gray-700">Position</span>
                    <button
                      onClick={() => setDesignTransform(prev => ({
                        ...prev,
                        position: { x: 0, y: 0 }
                      }))}
                      className="px-3 py-1.5 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-all"
                    >
                      Center
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* T-Shirt View Controls */}
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