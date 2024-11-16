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
import { DesignService } from '../../services/designService';
import { DesignTransform } from './types';

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
  const [color, setColor] = useState('#ffffff');
  const [size, setSize] = useState('M');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [designTexture, setDesignTexture] = useState<string | null>(null);
  const [designTransform, setDesignTransform] = useState<DesignTransform>(DesignService.getInitialDesignTransform());
  const [previousDesigns, setPreviousDesigns] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<CropType>();
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [transparency, setTransparency] = useState(0);
  const [designHistory, setDesignHistory] = useState<string[]>([]);

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
      setError('');
      setIsGenerating(true);
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
            const url = URL.createObjectURL(blob);
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
      color: color,
      size: size,
      timestamp: new Date().toISOString()
    };
    console.log('Adding to cart:', cartItem);
    alert('Added to cart successfully!');
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
        setDesignTexture(designUrl);
        await DesignService.saveDesignToHistory(designUrl);
        setPreviousDesigns(prev => [...prev, designUrl]);
        setDesignTransform(DesignService.getInitialDesignTransform());
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
      const processedImageUrl = await DesignService.removeBackground(designTexture);
      if (processedImageUrl) {
        setDesignTexture(processedImageUrl);
        setDesignTransform(prev => ({
          ...prev,
          hasBackground: false
        }));
      } else {
        throw new Error('Failed to process image');
      }
    } catch (error) {
      console.error('Background removal failed:', error);
      setError('Failed to remove background. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransparencyChange = async (transparency: number) => {
    if (!designTexture) {
      setError('Please generate a design first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const processedImageUrl = await DesignService.adjustTransparency(designTexture, transparency);
      if (processedImageUrl) {
        setDesignTexture(processedImageUrl);
      } else {
        throw new Error('Failed to process image');
      }
    } catch (error) {
      console.error('Transparency change failed:', error);
      setError('Failed to adjust transparency. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (designRef.current) {
      const rect = designRef.current.getBoundingClientRect();
      dragStartPosition.current = { x: e.clientX, y: e.clientY };
      isDragging.current = true;
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
    }
  };

  const handleDragMove = (e: MouseEvent) => {
    if (isDragging.current && designRef.current) {
      const newX = e.clientX - designRef.current.getBoundingClientRect().left;
      const newY = e.clientY - designRef.current.getBoundingClientRect().top;
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

  const handleLoadPreviousDesign = async (design: string) => {
    setDesignTexture(design);
    setDesignTransform(DesignService.getInitialDesignTransform());
    await DesignService.saveDesignToHistory(design);
  };

  const handleReset = () => {
    setDesignTransform(DesignService.getInitialDesignTransform());
    setTransparency(0);
  };

  const designRef = useRef<HTMLImageElement>(null);
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  return (
    <div className="container mx-auto px-4 py-4 max-w-7xl">
      <Helmet>
        <title>Custom T-Shirt Design - AI Generated</title>
      </Helmet>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col space-y-3">
          {/* Upper Controls - Size and Rotation */}
          <div className="mb-4 flex justify-between items-center bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="2XL">2XL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rotation</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={designTransform.rotation}
                  onChange={(e) => setDesignTransform(prev => ({
                    ...prev,
                    rotation: parseInt(e.target.value)
                  }))}
                  className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-600">{designTransform.rotation}°</span>
              </div>
            </div>
          </div>

          {/* Main Design Area */}
          <div className="relative bg-white rounded-lg shadow-lg p-4">
            {/* Design Display */}
            {designTexture && (
              <div className="relative w-full aspect-square">
                <img
                  src={getColorAdjustedImage(tshirtViews['hanging'], color)}
                  alt="T-Shirt"
                  className="w-full h-full object-contain"
                />
                <Draggable onDragStart={handleDragStart}>
                  <div
                    ref={designRef}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: `translate(-50%, -50%) scale(${designTransform.scale}) rotate(${designTransform.rotation}deg)`,
                      cursor: 'move',
                    }}
                  >
                    <img
                      src={designTexture}
                      alt="Design"
                      className="max-w-full max-h-full"
                    />
                  </div>
                </Draggable>
              </div>
            )}

            {/* Inside Box Controls */}
            <div className="mt-4 border-t pt-4">
              <div className="flex flex-wrap items-center gap-3">
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
                  <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.9991 12C20.9991 16.9706 16.9697 21 11.9991 21C7.02848 21 2.99908 16.9706 2.99908 12C2.99908 7.02944 7.02848 3 11.9991 3C16.9697 3 20.9991 7.02944 20.9991 12Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M2.99908 12H4.99908M18.9991 12H20.9991M11.9991 4V2M11.9991 22V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {designTransform.hasBackground ? "Remove BG" : "BG Removed"}
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
                  className="flex items-center px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Reload
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200"
                >
                  <Undo2 className="w-4 h-4 mr-1.5" />
                  Reset
                </button>

                {/* Color and Transparency Controls */}
                <div className="flex items-center gap-3 ml-auto">
                  <div className="relative">
                    <button
                      onClick={() => setIsPickingColor(!isPickingColor)}
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: color }}
                    />
                    {/* {isPickingColor && (
                      <div className="absolute top-full right-0 mt-2 z-10">
                        <ColorPicker
                          color={color}
                          onChange={setColor}
                          onClose={() => setIsPickingColor(false)}
                        />
                      </div>
                    )} */}
                  </div>
                  <div className="w-32">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={transparency}
                      onChange={(e) => {
                        const newTransparency = parseInt(e.target.value);
                        setTransparency(newTransparency);
                        handleTransparencyChange(newTransparency);
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <span className="text-sm text-gray-600 min-w-[40px] text-right">
                    {transparency}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Lower Controls - Scale */}
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
                    onClick={() => handleLoadPreviousDesign(design)}
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

export default CustomDesign;