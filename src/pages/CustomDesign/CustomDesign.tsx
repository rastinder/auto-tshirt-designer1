// CustomDesign.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Crop, AlertCircle, Loader2, Undo2, RotateCcw, Pipette } from 'lucide-react';
import { ColorPicker } from '../../components/TShirtCustomizer/ColorPicker';
import { SizeSelector } from '../../components/TShirtCustomizer/SizeSelector';
import { PromptInput } from '../../components/TShirtCustomizer/PromptInput';
import ReactCrop, { Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { DesignService } from '../../services/designService';
import { DesignTransform } from './types';
import { DraggableDesign } from '../../components/DraggableDesign/DraggableDesign';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface DesignTransform {
  hasBackground: boolean;
  texture: string | null;
  rotation: number;
  scale: number;
  position: { x: number; y: number };
  x: number;
  y: number;
}

const CustomDesign: React.FC = () => {
  const [tShirtColor, setTShirtColor] = useState('#ffffff');
  const [designColor, setDesignColor] = useState<string>('#000000');
  const [colorIntensity, setColorIntensity] = useState(0);
  const [size, setSize] = useState('M');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [designTexture, setDesignTexture] = useState<string | null>(null);
  const [designTransform, setDesignTransform] = useState<DesignTransform>({
    hasBackground: true,
    texture: null,
    rotation: 0,
    scale: 1,
    position: { x: 0, y: 0 }
  });
  const [previousDesigns, setPreviousDesigns] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<CropType>();
  const [isPickingDesignColor, setIsPickingDesignColor] = useState(false);
  const [designHistory, setDesignHistory] = useState<string[]>([]);
  const [previewColor, setPreviewColor] = useState<string>('#000000');

  const tshirtViews = {
    hanging: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_replace_color:FFFFFF:60:white/l_hanging-shirt-texture,o_0,fl_relative,w_1.0/l_Hanger_qa2diz,fl_relative,w_1.0/Hanging_T-Shirt_v83je9.jpg",
    laying: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_replace_color:FFFFFF:60:white/l_laying-shirt-texture,o_0,fl_relative,w_1.0/laying-shirt_xqstgr.jpg",
    model: "https://res.cloudinary.com/demo-robert/image/upload/w_700/e_replace_color:FFFFFF:60:white/u_model2,fl_relative,w_1.0/l_heather_texture,o_0,fl_relative,w_1.0/shirt_only.jpg"
  };

  const getColorAdjustedImage = (imageUrl: string, color: string) => {
    // Convert hex to uppercase without #
    const hex = color.toUpperCase().replace('#', '');
    
    // Replace the color in the URL
    return imageUrl.replace(/e_replace_color:FFFFFF:60:white/, `e_replace_color:${hex}:60:white`);
  };

  useEffect(() => {
    const checkAPI = async () => {
      try {
        const isHealthy = await DesignService.checkHealth();
        if (!isHealthy) {
          setError('API service is temporarily unavailable. Some features may be limited.');
        }
      } catch (error) {
        console.error('API health check failed:', error);
        setError('Unable to connect to the design service. Please try again later.');
      }
    };

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const history = await DesignService.loadDesignHistory();
        setPreviousDesigns(history.map(item => item.image_data));
      } catch (error) {
        console.error('Failed to load design history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    checkAPI();
    loadHistory();
  }, []);

  const handleRetry = () => {
    if (designTexture) {
      setDesignTexture(null);
      setDesignTransform({
        hasBackground: true,
        texture: null,
        rotation: 0,
        scale: 1,
        position: { x: 0, y: 0 }
      });
    }
  };

  const handleRestore = () => {
    setDesignTransform(prev => ({
      ...prev,
      scale: 1,
      rotation: 0
    }));
  };

  const handleLoadPreviousDesign = async (design: string) => {
    try {
      setIsLoadingHistory(true);
      if (currentObjectUrl.current) {
        URL.revokeObjectURL(currentObjectUrl.current);
      }
      setDesignTexture(design);
      // Keep the current position if it exists, otherwise use initial position
      setDesignTransform(prev => ({
        ...prev,
        hasBackground: true,
        texture: design,
        // Keep the existing position if available
        position: prev.position.x !== 0 && prev.position.y !== 0 
          ? prev.position 
          : { x: 300, y: 300 }, // Default center position
        rotation: 0,
        scale: 1
      }));
      setIsPickingDesignColor(false);
      setDesignColor('#000000');
      setColorIntensity(0);
    } catch (error) {
      console.error('Error loading previous design:', error);
      setError('Failed to load previous design');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleReset = () => {
    if (designTexture && containerRef.current) {
      setDesignTransform(prev => ({
        ...prev,
        texture: designTexture,
        rotation: 0,
        scale: 1,
        position: { 
          x: 300,
          y: 300
        },
        x: 300,
        y: 300
      }));
      
      setColorIntensity(0);
      setDesignColor('#000000');
      setIsPickingDesignColor(false);
      setIsCropping(false);
    }
  };

  const currentObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (currentObjectUrl.current) {
        URL.revokeObjectURL(currentObjectUrl.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentObjectUrl.current) {
      URL.revokeObjectURL(currentObjectUrl.current);
    }
  }, [designTexture]);

  const handleCropComplete = (crop: CropType, percentCrop: CropType) => {
    if (designRef.current && crop.width && crop.height) {
      const canvas = document.createElement('canvas');
      const image = designRef.current;
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
            // Revoke previous object URL if it exists
            if (currentObjectUrl.current) {
              URL.revokeObjectURL(currentObjectUrl.current);
            }
            const url = URL.createObjectURL(blob);
            currentObjectUrl.current = url;
            if (designTexture) {
              setDesignHistory(prev => [...prev, designTexture]);
            }
            setDesignTexture(url);
            setIsCropping(false);
          }
        });
      }
    }
  };

  const handleUndo = () => {
    if (designTexture) {
      const previousState = designTexture;
      setDesignTexture(null);
      setDesignTexture(previousState);
    }
  };

  const handleAddToCart = () => {
    if (!designTexture) {
      setError('Please create a design first');
      return;
    }
    const cartItem = {
      design: designTexture,
      color: tShirtColor,
      size: size,
      timestamp: new Date().toISOString()
    };
    console.log('Adding to cart:', cartItem);
    alert('Added to cart successfully!');
  };

  const handleSuccessfulGeneration = async (designUrl: string) => {
    if (currentObjectUrl.current) {
      URL.revokeObjectURL(currentObjectUrl.current);
    }
    setDesignTexture(designUrl);
    await DesignService.saveDesignToHistory(designUrl);
    // Only add to history if it's not already there
    setPreviousDesigns(prev => {
      if (!prev.includes(designUrl)) {
        return [...prev, designUrl];
      }
      return prev;
    });
    setDesignTransform(DesignService.getInitialDesignTransform());
  };

  const handleGenerate = async (prompt: string) => {
    if (!prompt.trim()) {
      setError('Please enter a design prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const designUrl = await DesignService.generateDesign(prompt);
      if (designUrl) {
        await handleSuccessfulGeneration(designUrl);
      } else {
        throw new Error('Failed to generate design');
      }
    } catch (error) {
      console.error('Error generating design:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate design. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackgroundToggle = async () => {
    if (!designTexture) {
      setError('Please generate a design first');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Keep exact current position and transform state
      const currentTransform = { ...designTransform };
      
      const processedImageUrl = await DesignService.removeBackground(designTexture);
      if (processedImageUrl) {
        setDesignTexture(processedImageUrl);
        setDesignTransform({
          ...currentTransform,
          hasBackground: !currentTransform.hasBackground,
          texture: processedImageUrl,
          // Keep the exact same position
          position: currentTransform.position
        });
      }
    } catch (error) {
      console.error('Error removing background:', error);
      setError('Failed to process image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const designRef = useRef<HTMLImageElement>(null);

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
    
    // Scale coordinates to actual image dimensions
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const actualX = Math.floor(x * scaleX);
    const actualY = Math.floor(y * scaleY);

    // Get pixel color
    const pixel = ctx.getImageData(actualX, actualY, 1, 1).data;
    const color = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
    
    setDesignColor(color);
    setIsPickingDesignColor(false);
  }, [isPickingDesignColor]);

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

  // Function to adjust color intensity
  const adjustColorIntensity = async (intensity: number) => {
    setColorIntensity(intensity);

    if (!designTexture) return;

    try {
      const processedImageUrl = await DesignService.adjustColorIntensity(designTexture, designColor, intensity);
      if (processedImageUrl) {
        setDesignTexture(processedImageUrl);
      } else {
        throw new Error('Failed to adjust color intensity');
      }
    } catch (error) {
      console.error('Error adjusting color intensity:', error);
      setError('Failed to adjust color intensity. Please try again later.');
    }
  };

  const handleColorPick = (color: string) => {
    setDesignColor(color);
    setColorIntensity(0); // Reset intensity when new color is picked
  };

  // Helper functions for color transformations
  const getHueRotation = (color: string) => {
    // Convert hex to HSL
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;

    if (max === min) {
      h = 0; // achromatic
    } else {
      const d = max - min;
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h *= 60;
    }

    return `${h}deg`;
  };

  const getSaturation = (color: string) => {
    // Convert hex to HSL
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let s = 0;

    if (max === min) {
      s = 0; // achromatic
    } else {
      const l = (max + min) / 2;
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    }

    return s * 100;
  };

  const handleDesignTransformChange = (newTransform: DesignTransform) => {
    setDesignTransform(newTransform);
  };

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <Helmet>
          <title>Custom T-Shirt Design - AI Generated</title>
        </Helmet>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="flex flex-col space-y-3">
            {/* Upper Controls */}
            <div className="mb-4 flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-4">
                {/* Any other upper controls can go here */}
              </div>
            </div>

            {/* Main Design Area */}
            <div className="relative bg-white rounded-lg shadow-lg p-4 design-container" ref={containerRef}>
              {/* Design Display */}
              <div className="relative w-full aspect-square bg-gray-100 rounded-lg">
                {/* T-shirt layer */}
                <div className="absolute inset-0 flex items-center justify-center z-0">
                  <img
                    src={getColorAdjustedImage(tshirtViews['hanging'], tShirtColor)}
                    alt="T-Shirt"
                    className="w-full h-full object-contain"
                  />
                </div>
                {/* Design layer */}
                {designTexture && (
                  <DraggableDesign
                    designTexture={designTexture}
                    designTransform={designTransform}
                    onTransformChange={handleDesignTransformChange}
                    isCropping={isCropping}
                    crop={crop}
                    onCropChange={setCrop}
                    onCropComplete={handleCropComplete}
                    isPickingDesignColor={isPickingDesignColor}
                    setIsPickingDesignColor={setIsPickingDesignColor}
                    onDesignColorChange={handleColorPick}
                  />
                )}
              </div>

              {/* Inside Box Controls */}
              <div className="mt-4 border-t pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Only show controls when design is generated */}
                  {designTexture && (
                    <>
                      {/* Main Controls */}
                      <button
                        onClick={() => setIsCropping(!isCropping)}
                        className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-all ${
                          isCropping 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'text-gray-700 hover:bg-gray-50 border border-gray-200'
                        }`}
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
                        }`}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <Crop className="w-4 h-4 mr-1.5" />
                        )}
                        {designTransform.hasBackground ? 'Remove Background' : 'Add Background'}
                      </button>

                      <button
                        onClick={handleRetry}
                        disabled={isGenerating}
                        className="flex items-center px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4 mr-1.5" />
                        )}
                        Remove Image
                      </button>

                      <button
                        onClick={handleReset}
                        className="flex items-center px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200"
                      >
                        <Undo2 className="w-4 h-4 mr-1.5" />
                        Reset
                      </button>

                      {/* Design Color Controls */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setIsPickingDesignColor(!isPickingDesignColor)}
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                            isPickingDesignColor 
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                              : 'bg-white text-gray-700 hover:bg-gray-100'
                          } border border-gray-300`}
                        >
                          {isPickingDesignColor ? 'Cancel' : 'Pick Color'}
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded border border-gray-300 ${
                              isPickingDesignColor ? 'ring-2 ring-blue-500' : ''
                            } hover:border-gray-400`}
                            style={{ backgroundColor: designColor }}
                          />
                          <div className="text-xs text-gray-500 uppercase">
                            {designColor.toUpperCase()}
                          </div>
                        </div>

                        {/* Color Intensity Slider */}
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-sm text-gray-500">Intensity:</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={colorIntensity}
                            onChange={(e) => adjustColorIntensity(Number(e.target.value))}
                            className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-sm text-gray-500">{colorIntensity}%</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Lower Controls - Scale */}
            {designTexture && (
              <>
                {/* Scale Control */}
                <div className="mt-4 bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Scale</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={designTransform.scale}
                      onChange={(e) => setDesignTransform(prev => ({
                        ...prev,
                        scale: parseFloat(e.target.value)
                      }))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">{designTransform.scale.toFixed(1)}x</span>
                  </div>
                </div>
              </>
            )}
            {/* Previous Designs Gallery */}
            {previousDesigns.length > 0 && (
              <div className="absolute right-4 top-4 w-[90px] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="text-xs text-gray-600 font-medium text-center">History</div>
                </div>
                <div className="p-2 flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  {/* Show unique designs only */}
                  {[...new Set(previousDesigns)].slice(-4).map((design, index, array) => (
                    <button
                      key={design}
                      onClick={() => handleLoadPreviousDesign(design)}
                      className="relative w-[70px] h-[70px] mx-auto bg-white rounded-lg border border-gray-200 hover:border-blue-500 overflow-hidden shadow-sm transition-all hover:scale-105 focus:outline-none focus:border-blue-500 group"
                      title={`Load previous design ${array.length - index}`}
                    >
                      <img
                        src={design}
                        alt={`Previous design ${array.length - index}`}
                        className="w-full h-full object-contain p-1"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                      <div className="absolute bottom-0 left-0 right-0 text-[10px] text-center bg-black/50 text-white py-0.5">
                        #{array.length - index}
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

          <div className="flex flex-col space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <h1 className="text-3xl font-bold mb-6">Customize Your T-Shirt</h1>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Select T-Shirt Color</h3>
                  <div className="flex-1">
                    <ColorPicker
                      color={tShirtColor}
                      onChange={setTShirtColor}
                    />
                  </div>
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
    </DndProvider>
  );
}

export default CustomDesign;