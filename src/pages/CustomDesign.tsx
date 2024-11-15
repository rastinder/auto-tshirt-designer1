import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Crop, AlertCircle, Loader2, Undo2 } from 'lucide-react';
import { Scene } from '../components/TShirtCustomizer/Scene';
import { ColorPicker } from '../components/TShirtCustomizer/ColorPicker';
import { SizeSelector } from '../components/TShirtCustomizer/SizeSelector';
import { PromptInput } from '../components/TShirtCustomizer/PromptInput';
import ReactCrop, { Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { removeBackground } from '../services/backgroundRemoval';
import { debounce } from 'lodash';

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
  hasBackground: boolean;
  texture: string | null;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  originalWidth: number;
  originalHeight: number;
  position: { x: number; y: number };
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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [designTexture, setDesignTexture] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#fef900');
  const [transparency, setTransparency] = useState(50);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [designTransform, setDesignTransform] = useState<DesignTransform>({
    hasBackground: true,
    texture: null,
    width: 200,
    height: 200,
    rotation: 0,
    scale: 1,
    originalWidth: 200,
    originalHeight: 200,
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
  const nodeRef = useRef(null);
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
      setPreviousDesigns(prev => {
        const newDesigns = [...prev, imageData];
        return newDesigns.slice(-5);
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
    const maxRetries = 30;
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
      const processedImageUrl = await removeBackground(designTexture);
      updateDesignWithHistory(processedImageUrl);
      setDesignTransform(prev => ({
        ...prev,
        hasBackground: false
      }));
    } catch (error: any) {
      console.error('Error removing background:', error);
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
    const cartItem = {
      design: designTexture,
      color: color,
      size: size,
      timestamp: new Date().toISOString()
    };
    console.log('Adding to cart:', cartItem);
    alert('Added to cart successfully!');
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
    debouncedTransparencyChange(transparency);
  };

  const debouncedTransparencyChange = useCallback(
    debounce(async (newTransparency: number) => {
      if (!selectedColor) return;
      try {
        setIsLoading(true);
        setError(null);
        const colorHex = selectedColor.replace('#', '');
        const formData = new FormData();
        if (designTexture) {
          const response = await fetch(designTexture);
          const blob = await response.blob();
          formData.append('file', blob);
        }
        formData.append('color', colorHex);
        formData.append('tolerance', (newTransparency / 100).toString());

        const result = await fetch('http://localhost:8000/color_transparency', {
          method: 'POST',
          body: formData,
        });

        if (!result.ok) {
          throw new Error(`Failed to apply transparency: ${result.statusText}`);
        }

        const imageBlob = await result.blob();
        const imageUrl = URL.createObjectURL(imageBlob);
        setDesignTexture(imageUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply transparency');
        console.error('Error applying transparency:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [designTexture, selectedColor]
  );

  const handleTransparencyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTransparency = parseInt(event.target.value);
    setTransparency(newTransparency);
    debouncedTransparencyChange(newTransparency);
  };

  const handleReset = () => {
    setSelectedColor('#fef900');
    setTransparency(50);
    setIsPickingColor(false);
    if (designTexture) {
      debouncedTransparencyChange(50);
    }
  };

  const handleImageReset = () => {
    if (designTexture) {
      setTransparency(50);
      setSelectedColor('#fef900');
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
              <div
                ref={designRef}
                className="absolute top-0 left-0 cursor-move"
                onMouseDown={handleDragStart}
              >
                <div
                  className="relative"
                  style={{
                    width: designTransform.width,
                    height: designTransform.height,
                    transform: `translate(${designTransform.position.x}px, ${designTransform.position.y}px)`
                  }}
                >
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
                    <div className="w-px h-4 bg-gray-200 mx-1" />
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

                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      transform: `rotate(${designTransform.rotation}deg) scale(${designTransform.scale})`,
                      transition: 'transform 0.1s ease',
                    }}
                    className="cursor-move relative"
                  >
                    <img
                      src={designTexture}
                      alt="Design"
                      className={`w-full h-full object-contain ${isPickingColor ? 'cursor-crosshair' : ''}`}
                      onClick={handleColorPick}
                    />
                  </div>

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
            )}

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

          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Select Color</h3>
            <ColorPicker color={color} onChange={setColor} />
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Select Size</h3>
            <SizeSelector size={size} onChange={setSize} />
          </div>

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

          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Generate Design</h3>
            <PromptInput onGenerate={handleGenerateDesign} isGenerating={isGenerating} />
          </div>

          <div className="space-y-4">
            {designTexture && (
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCropping(!isCropping)}
                    className="flex items-center h-[34px] px-2 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 whitespace-nowrap"
                  >
                    <Crop className="w-4 h-4 mr-1" />
                    {isCropping ? 'Cancel Crop' : 'Crop Design'}
                  </button>
                  <button
                    onClick={handleBackgroundToggle}
                    disabled={isLoading}
                    className={`flex items-center h-[34px] px-2 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 whitespace-nowrap ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={designTransform.hasBackground ? "Remove background from design" : "Background already removed"}
                  >
                    {isLoading ? (
                      <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.9991 12C20.9991 16.9706 16.9697 21 11.9991 21C7.02848 21 2.99908 16.9706 2.99908 12C2.99908 7.02944 7.02848 3 11.9991 3C16.9697 3 20.9991 7.02944 20.9991 12Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M2.99908 12H4.99908M18.9991 12H20.9991M11.9991 4V2M11.9991 22V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    )}
                    {designTransform.hasBackground ? "Remove Background" : "No Background"}
                  </button>
                  <div className="flex items-center bg-blue-100 rounded h-[34px] px-2 py-1.5">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={transparency}
                      onChange={handleTransparencyChange}
                      disabled={isLoading || !selectedColor}
                      className="w-40 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                      onClick={() => setIsPickingColor(!isPickingColor)}
                      disabled={isLoading}
                      className={`ml-2 p-1 rounded ${isPickingColor ? 'bg-blue-200' : 'hover:bg-blue-200'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Pick color for transparency"
                    >
                      {isLoading ? (
                        <svg className="animate-spin w-4 h-4 text-blue-700" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M7 7h10v10H7z" />
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    {selectedColor && (
                      <div
                        className="ml-2 w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: selectedColor }}
                      />
                    )}
                    <div className="ml-2 text-sm text-gray-600">
                      {transparency}%
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center h-[34px] px-2 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 whitespace-nowrap"
                    title="Reset transparency"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div>
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
    </div>
  );
}