import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2, AlertCircle } from 'lucide-react';
import Scene from '../components/TShirtCustomizer/Scene';
import ColorPicker from '../components/TShirtCustomizer/ColorPicker';
import SizeSelector from '../components/TShirtCustomizer/SizeSelector';
import PromptInput from '../components/TShirtCustomizer/PromptInput';
import ProgressBar from '../components/ProgressBar';

interface DesignResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: {
    image_url: string;
    error?: string;
  };
}

const PROMPT_TEMPLATES = {
  prefix: "a t-shirt with",
  suffix: ", professional product photography, centered composition, high quality",
  negative: "distorted, blurry, bad art, watermark, text, deformed, out of frame, cropped, low quality"
};

export default function CustomDesign() {
  const [color, setColor] = useState('#ffffff');
  const [size, setSize] = useState('M');
  const [isGenerating, setIsGenerating] = useState(false);
  const [designTexture, setDesignTexture] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

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
    setDesignTexture(null);
    setProgress(0);

    try {
      const formattedPrompt = formatPrompt(prompt, color);
      const response = await fetch('http://141.148.223.177:8000/design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: formattedPrompt,
          negative_prompt: PROMPT_TEMPLATES.negative,
          style: 'realistic',
          priority: 1
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data: DesignResponse = await response.json();
      console.log('Design request response:', data);
      setTaskId(data.task_id);

      pollDesignStatus(data.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate design');
      setIsGenerating(false);
    }
  };

  const pollDesignStatus = async (taskId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`http://141.148.223.177:8000/status/${taskId}`);
        if (!response.ok) {
          throw new Error('Failed to check design status');
        }

        const data: DesignResponse = await response.json();
        console.log('Status data:', data);

        // Update progress
        if (data.progress !== undefined) {
          setProgress(data.progress);
        }

        if (data.status === 'completed' && data.result?.image_url) {
          const imageUrl = `http://141.148.223.177:8000${data.result.image_url}`;
          console.log('Setting image URL:', imageUrl);
          setDesignTexture(imageUrl);
          setIsGenerating(false);
          setProgress(100);
          return;
        } else if (data.status === 'failed') {
          throw new Error(data.result?.error || 'Design generation failed');
        }

        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Design generation timed out');
        }

        // Continue polling with shorter interval for better responsiveness
        setTimeout(poll, 500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check design status');
        setIsGenerating(false);
      }
    };

    poll();
  };

  return (
    <>
      <Helmet>
        <title>Custom Design | AI Tees</title>
        <meta
          name="description"
          content="Create your own unique t-shirt design using AI-powered tools"
        />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold mb-8">Custom T-Shirt Designer</h1>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* 3D Preview */}
            <div className="bg-white rounded-lg shadow-lg p-6 h-[600px] relative">
              {isGenerating && (
                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                  <div className="text-center mb-4">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-2" />
                    <p className="text-gray-600">Generating your design with AI...</p>
                  </div>
                  <div className="w-64">
                    <ProgressBar progress={progress} />
                  </div>
                </div>
              )}
              <Scene color={color} texture={designTexture} />
            </div>

            {/* Controls */}
            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Design Options</h2>
                
                {/* Color Picker */}
                <div className="mb-6">
                  <h3 className="font-medium mb-3">T-Shirt Color</h3>
                  <ColorPicker color={color} onChange={setColor} />
                </div>

                {/* Size Selector */}
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Size</h3>
                  <SizeSelector selectedSize={size} onSizeChange={setSize} />
                </div>

                {/* Prompt Input */}
                <div>
                  <h3 className="font-medium mb-3">Design Prompt</h3>
                  <PromptInput 
                    onGenerate={handleGenerateDesign}
                    isGenerating={isGenerating}
                  />
                  {error && (
                    <div className="mt-2 text-red-600 text-sm flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Add to Cart */}
              <button
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={!designTexture || isGenerating}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}