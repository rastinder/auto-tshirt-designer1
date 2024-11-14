import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Crop, AlertCircle, Loader2, Undo2 } from 'lucide-react';
import { Scene } from '../components/TShirtCustomizer/Scene';
import { ColorPicker } from '../components/TShirtCustomizer/ColorPicker';
import { SizeSelector } from '../components/TShirtCustomizer/SizeSelector';
import { PromptInput } from '../components/TShirtCustomizer/PromptInput';
import Draggable from 'react-draggable';
import ReactCrop, { Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { removeBackground } from '../services/backgroundRemoval';

interface DesignResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: {
    image_data: string;
    error?: string;
  };
}

interface DesignTransform {
  width: number;
  height: number;
  rotation: number;
  scale: number;
  originalWidth: number;
  originalHeight: number;
  hasBackground: boolean;
}

// API URL configuration
const isDevelopment = import.meta.env.DEV;
const apiBaseUrl = isDevelopment ? 'http://localhost:8000' : '/api';

const PROMPT_TEMPLATES = {
  prefix: "",
  suffix: ", professional product photography, centered composition, high quality",
  negative: "distorted, blurry, bad art, watermark, text, deformed, out of frame, cropped, low quality"
};

export default function CustomDesign() {
  const [color, setColor] = useState('#ffffff');
  const [size, setSize] = useState('M');
  const [isGenerating, setIsGenerating] = useState(false);
  const [designTexture, setDesignTexture] = useState<string | null>(null);
  const [previousDesigns, setPreviousDesigns] = useState<string[]>([]);
  const [designHistory, setDesignHistory] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [viewMode, setViewMode] = useState('hanging');
  const [isCropping, setIsCropping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transparency, setTransparency] = useState(100);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [crop, setCrop] = useState<CropType>({
    unit: '%',
    x: 0,
    y: 0,
    width: 100,
    height: 100
  });
  const [designTransform, setDesignTransform] = useState<DesignTransform>({
    width: 200,
    height: 200,
    rotation: 0,
    scale: 1,
    originalWidth: 200,
    originalHeight: 200,
    hasBackground: true
  });
  const [isResizing, setIsResizing] = useState(false);
  
  const designRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const nodeRef = useRef(null); // Add this ref for Draggable

  const tshirtViews = {
    hanging: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_red:0/e_blue:0/e_green:0/l_hanging-shirt-texture,o_0,fl_relative,w_1.0/l_Hanger_qa2diz,fl_relative,w_1.0/Hanging_T-Shirt_v83je9.jpg",
    laying: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_red:0/e_blue:0/e_green:0/l_laying-shirt-texture,o_0,fl_relative,w_1.0/laying-shirt_xqstgr.jpg",
    model: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_red:0/e_blue:0/e_green:0/u_model2,fl_relative,w_1.0/l_heather_texture,o_0,fl_relative,w_1.0/shirt_only.jpg"
  };

  const getColorAdjustedImage = (imageUrl: string, color: string) => {
    const hexColor = color.replace('#', '');
    return imageUrl.replace(/e_red:0\/e_blue:0\/e_green:0/, `e_replace_color:${hexColor}:60:white`);
  };

  const checkLocalServer = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/`);
      if (response.ok) {
        console.log('API is available');
      } else {
        console.log('API is not available');
      }
    } catch (err) {
      console.log('API is not available');
    }
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
    const loadPreviousDesigns = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await fetch(`${apiBaseUrl}/previous-designs`);
        if (response.ok) {
          const designs = await response.json();
          setPreviousDesigns(designs);
          console.log('Loaded previous designs:', designs);
        }
      } catch (err) {
        console.error('Failed to load previous designs:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadPreviousDesigns();
  }, []);

  const saveDesignToHistory = async (imageData: string) => {
    try {
      await fetch(`${apiBaseUrl}/save-design`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: imageData
        }),
      });
      
      // Update local state with new design
      setPreviousDesigns(prev => {
        const newDesigns = [...prev, imageData];
        return newDesigns.slice(-5); // Keep only last 5 designs
      });
    } catch (err) {
      console.error('Failed to save design to history:', err);
    }
  };

  const formatPrompt = (basePrompt: string, color: string) => {
    const colorName = getColorName(color);
    return `${PROMPT_TEMPLATES.prefix} ${basePrompt} on a ${colorName} background, ${PROMPT_TEMPLATES.suffix}`;
  };

  const getColorName = (hex: string) => {
    const colors: { [key: string]: string } = {
      '#ffffff': 'white',
      '#000000': 'black',
      '#0f172a': 'navy',
      '#6b7280': 'gray',
      '#ef4444': 'red',
      '#22c55e': 'green',
      '#3b82f6': 'blue',
      '#a855f7': 'purple'
    };
    return colors[hex] || 'white';
  };

  const handleGenerateDesign = async (prompt: string) => {
    setIsGenerating(true);
    setError('');
    
    try {
      const formattedPrompt = formatPrompt(prompt, color);
      const response = await fetch(`${apiBaseUrl}/design`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: formattedPrompt,
          negative_prompt: PROMPT_TEMPLATES.negative
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate design');
      }

      const data = await response.json();
      
      if (data.task_id) {
        setTaskId(data.task_id);
        // Start polling for status
        await pollDesignStatus(data.task_id);
      } else {
        throw new Error('No task ID received');
      }
    } catch (err) {
      console.error('Error generating design:', err);
      setError('Failed to generate design. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const pollDesignStatus = async (taskId: string) => {
    const maxRetries = 30; // 30 seconds
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const response = await fetch(`${apiBaseUrl}/status/${taskId}`);
        if (!response.ok) {
          throw new Error('Failed to get status');
        }

        const data = await response.json();
        console.log('Status response:', data);

        if (data.status === 'completed' && data.result?.image_data) {
          updateDesignWithHistory(data.result.image_data);
          await saveDesignToHistory(data.result.image_data);
          return;
        } else if (data.status === 'failed') {
          throw new Error(data.error || 'Design generation failed');
        }

        // Wait 1 second before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries++;
      } catch (err) {
        console.error('Error polling status:', err);
        setError('Failed to get design status. Please try again.');
        break;
      }
    }

    if (retries >= maxRetries) {
      setError('Design generation timed out. Please try again.');
    }
  };

  const handleRetry = () => {
    if (taskId) {
      setError('');
      setIsGenerating(true);
      setRetryCount(0);
      pollDesignStatus(taskId);
    }
  };

  const handleRestore = () => {
    setDesignTransform(prev => ({
      ...prev,
      scale: 1,
      rotation: 0
    }));
  };

  const handleResize = (direction: 'increase' | 'decrease') => {
    setDesignTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(3, prev.scale + (direction === 'increase' ? 0.05 : -0.05)))
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
            updateDesignWithHistory(url);
            setIsCropping(false);
          }
        });
      }
    }
  };

  const handleBackgroundToggle = async () => {
    if (!designTexture || isLoading) return;

    try {
      setIsLoading(true);
      
      // Call the background removal service
      const processedImageUrl = await removeBackground(designTexture);
      
      // Update the design texture and state
      updateDesignWithHistory(processedImageUrl);
      setDesignTransform(prev => ({
        ...prev,
        hasBackground: false
      }));
    } catch (error: any) {
      console.error('Error removing background:', error);
      // Show error in the UI
      setError(error.message || 'Failed to remove background. Please try again.');
    } finally {
      setIsLoading(false);
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

  const updateDesignWithHistory = (newDesign: string | null) => {
    if (designTexture) {
      setDesignHistory([...designHistory, designTexture]);
    }
    setDesignTexture(newDesign);
  };

  const handleAddToCart = () => {
    if (!designTexture) {
      setError('Please create a design first');
      return;
    }
    
    // Here you can add the logic to add the item to cart
    // For example, save the current design, color, and size
    const cartItem = {
      design: designTexture,
      color: color,
      size: size,
      timestamp: new Date().toISOString()
    };

    // You can dispatch this to your cart state management
    console.log('Adding to cart:', cartItem);
    
    // Show success message
    alert('Added to cart successfully!');
  };

  const handleColorPick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!isPickingColor) return;

    const img = event.currentTarget;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const rect = img.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const pixel = ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
    const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
    
    setSelectedColor(color);
    setIsPickingColor(false);
  };

  const handleReset = () => {
    setTransparency(100);
    setSelectedColor(null);
    setIsPickingColor(false);
    if (!designTransform.hasBackground) {
      handleBackgroundToggle();
    }
  };

  const handleImageReset = () => {
    if (designTexture) {
      // Reset all states without removing the image
      setTransparency(100);
      setSelectedColor(null);
      setIsPickingColor(false);
      
      // Reset design transform without triggering loading state
      setDesignTransform({
        ...designTransform,
        hasBackground: true,
        scale: 1,
        rotation: 0,
        position: { x: 0, y: 0 }
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-7xl">
      <Helmet>
        <title>Custom T-Shirt Design - AI Generated</title>
      </Helmet>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col space-y-3">
          <div className="relative aspect-square bg-white rounded-lg overflow-hidden shadow-lg">
            <img
              src={getColorAdjustedImage(tshirtViews[viewMode], color)}
              alt={`T-shirt ${viewMode} view`}
              className="w-full h-full object-contain"
            />
            
            {designTexture && !isCropping && (
              <Draggable 
                bounds="parent"
                nodeRef={nodeRef}
              >
                <div ref={nodeRef} className="absolute top-1/4 left-1/4 cursor-move">
                  <div 
                    className="relative"
                    style={{
                      width: designTransform.width,
                      height: designTransform.height
                    }}
                  >
                    {/* Rotation and Reset Controls */}
                    <div 
                      className="absolute -top-16 left-1/2 transform -translate-x-1/2 flex items-center bg-white rounded-lg shadow-sm py-0.5 px-1 select-none gap-1"
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ cursor: 'default' }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDesignTransform(prev => ({
                            ...prev,
                            rotation: prev.rotation - 5
                          }));
                        }}
                        className="text-gray-700 hover:text-blue-500 px-0.5 text-xs"
                      >
                        ↺
                      </button>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={designTransform.rotation}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          setDesignTransform(prev => ({
                            ...prev,
                            rotation: parseInt(e.target.value)
                          }));
                        }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setDesignTransform(prev => ({
                            ...prev,
                            rotation: prev.rotation + 5
                          }));
                        }}
                        className="text-gray-700 hover:text-blue-500 px-0.5 text-xs"
                      >
                        ↻
                      </button>
                      <div className="w-px h-4 bg-gray-200 mx-1" /> {/* Divider */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore();
                        }}
                        className="text-gray-700 hover:text-blue-500 px-1 text-xs flex items-center"
                        title="Reset size and rotation"
                      >
                        Reset
                      </button>
                    </div>

                    {/* Image container with rotation and scale */}
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        transform: `rotate(${designTransform.rotation}deg) scale(${designTransform.scale})`,
                        transition: 'transform 0.1s ease',
                        opacity: !designTransform.hasBackground ? transparency / 100 : 1
                      }}
                      className="cursor-move relative"
                      ref={designRef}
                    >
                      <img
                        src={designTexture}
                        alt="Design"
                        className={`w-full h-full object-contain ${isPickingColor ? 'cursor-crosshair' : ''}`}
                        style={selectedColor ? {
                          filter: `opacity(${transparency}%) saturate(0) brightness(1.2)`
                        } : undefined}
                        onClick={handleColorPick}
                      />

                      {/* Resize controls */}
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-center bg-white rounded-lg shadow-sm py-0.5 px-1 select-none gap-2">
                        <button
                          onClick={() => handleResize('decrease')}
                          className="text-gray-700 hover:text-blue-500 w-6 h-6 flex items-center justify-center rounded-full"
                        >
                          -
                        </button>
                        <div className="text-xs text-gray-500">
                          {Math.round(designTransform.scale * 100)}%
                        </div>
                        <button
                          onClick={() => handleResize('increase')}
                          className="text-gray-700 hover:text-blue-500 w-6 h-6 flex items-center justify-center rounded-full"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Draggable>
            )}

            {/* Previous Designs Gallery */}
            {previousDesigns.length > 0 && (
              <div className="absolute right-4 top-4 flex flex-col gap-2 z-50">
                {previousDesigns.map((design, index) => (
                  <button
                    key={index}
                    onClick={() => updateDesignWithHistory(design)}
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

            {/* Cropping overlay */}
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

          {/* View mode thumbnails */}
          <div className="flex justify-center space-x-3">
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

        <div className="flex flex-col space-y-4 sticky top-4">
          <div className="flex flex-col md:flex-row">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Customize Your T-Shirt</h1>
            </div>
          </div>

          {/* 1. Color Picker */}
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Select Color</h3>
            <ColorPicker color={color} onChange={setColor} />
          </div>

          {/* 2. Size Selector */}
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Select Size</h3>
            <SizeSelector size={size} onChange={setSize} />
          </div>

          {/* 3. Details Section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Product Details</h3>
            <div className="bg-gray-50 p-2 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-x-4">
                <div>• 100% Premium Cotton</div>
                <div>• Pre-shrunk fabric</div>
                <div>• Classic fit</div>
                <div>• Double-needle hem</div>
              </div>
            </div>
          </div>

          {/* 4. Design Generator */}
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Generate Design</h3>
            <PromptInput onGenerate={handleGenerateDesign} isGenerating={isGenerating} />
          </div>

          {/* 5. Design Controls (Crop & Background) */}
          {designTexture && (
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsCropping(!isCropping)}
                  className="flex items-center px-2 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  <Crop className="w-4 h-4 mr-1" />
                  {isCropping ? 'Cancel Crop' : 'Crop Design'}
                </button>
                <button
                  onClick={handleBackgroundToggle}
                  disabled={isLoading}
                  className={`flex items-center px-2 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={designTransform.hasBackground ? "Remove background from design" : "Background already removed"}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.9991 12C20.9991 16.9706 16.9697 21 11.9991 21C7.02848 21 2.99908 16.9706 2.99908 12C2.99908 7.02944 7.02848 3 11.9991 3C16.9697 3 20.9991 7.02944 20.9991 12Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M19 12H5" />
                        <path d="M15 16l4-4-4-4" />
                      </svg>
                      {designTransform.hasBackground ? "Remove Background" : "No Background"}
                    </>
                  )}
                </button>
                <div className="flex items-center space-x-1 bg-blue-100 rounded px-2 py-1.5">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={transparency}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setTransparency(value);
                    }}
                    className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      WebkitAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                  <button
                    onClick={() => setIsPickingColor(!isPickingColor)}
                    className={`ml-2 p-1 rounded ${isPickingColor ? 'bg-blue-200' : 'hover:bg-blue-200'}`}
                    title="Pick color for transparency"
                  >
                    <svg className="w-4 h-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 7h10v10H7z" />
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  {selectedColor && (
                    <div 
                      className="ml-2 w-4 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: selectedColor }}
                    />
                  )}
                  <button
                    onClick={handleReset}
                    className="ml-2 p-1 rounded hover:bg-blue-200"
                    title="Reset transparency and background"
                  >
                    <svg className="w-4 h-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0z" />
                      <path d="M19 12H5" />
                      <path d="M15 16l4-4-4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={handleImageReset}
                    className="flex items-center px-2 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    title="Reload current image"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 6. Add to Cart Button */}
          <div className="mt-4">
            <button
              onClick={handleAddToCart}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center gap-2"
              disabled={!designTexture || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                <>
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path d="M3 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0z" />
                    <path d="M19 12H5" />
                    <path d="M15 16l4-4-4-4" />
                  </svg>
                  Add to Cart
                </>
              )}
            </button>
            {error && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}