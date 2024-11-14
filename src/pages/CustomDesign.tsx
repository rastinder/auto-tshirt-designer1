import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2, AlertCircle, RefreshCcw } from 'lucide-react';
import Scene from '../components/TShirtCustomizer/Scene';
import ColorPicker from '../components/TShirtCustomizer/ColorPicker';
import SizeSelector from '../components/TShirtCustomizer/SizeSelector';
import PromptInput from '../components/TShirtCustomizer/PromptInput';

interface DesignResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: {
    image_data: string;
    error?: string;
  };
}

// API URL configuration
const isDevelopment = import.meta.env.DEV;
const apiBaseUrl = isDevelopment ? 'http://localhost:8000' : '/api';

console.log('Running in', isDevelopment ? 'development' : 'production', 'mode');
console.log('API base URL:', apiBaseUrl);

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
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
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

    checkLocalServer();
  }, []);

  useEffect(() => {
    return () => {
      setIsGenerating(false);
      setTaskId(null);
    };
  }, []);

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
    if (isGenerating) {
      console.log('Generation already in progress, ignoring request');
      return;
    }

    console.log('Starting design generation...');
    setIsGenerating(true);
    setError(null);
    setDesignTexture(null); // Clear previous design

    try {
      console.log('Sending design request with prompt:', prompt);
      const formattedPrompt = formatPrompt(prompt, color);
      const response = await fetch(`${apiBaseUrl}/design`, {
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
        console.error('Design request failed:', response.status);
        throw new Error('Failed to start design generation');
      }

      const data: DesignResponse = await response.json();
      console.log('Design request successful, task ID:', data.task_id);
      setTaskId(data.task_id);
      
      // Start polling for status
      await pollDesignStatus(data.task_id);
    } catch (err) {
      console.error('Error generating design:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate design');
      setIsGenerating(false);
    }
  };

  const pollDesignStatus = async (taskId: string) => {
    const maxAttempts = 60;
    let attempts = 0;
    let isPolling = true; // Local polling state

    const poll = async () => {
      if (!isPolling) {
        console.log('Polling stopped: local state cancelled');
        return;
      }

      try {
        console.log(`Polling attempt ${attempts + 1}/${maxAttempts} for task: ${taskId}`);
        const response = await fetch(`${apiBaseUrl}/status/${taskId}`);
        
        if (!response.ok) {
          console.error('Status check failed:', response.status);
          throw new Error('Failed to check design status');
        }

        const data: DesignResponse = await response.json();
        console.log('Status response:', data);

        if (data.status === 'completed' && data.result?.image_data) {
          console.log('Server confirms image generation completed');
          try {
            setDesignTexture(data.result.image_data);
            console.log('Image data set to state');
            // Only stop generating after successful image set
            setTimeout(() => {
              isPolling = false;
              setIsGenerating(false);
              console.log('Generation process completed');
            }, 500);
            return;
          } catch (err) {
            console.error('Error setting image data:', err);
            throw new Error('Failed to set image data');
          }
        } else if (data.status === 'failed') {
          console.error('Server reported generation failed:', data.result?.error);
          throw new Error(data.result?.error || 'Design generation failed');
        } else {
          console.log('Status:', data.status, '- continuing to poll');
        }

        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Timed out waiting for design');
        }

        // Continue polling after a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (isPolling) {
          await poll(); // Continue polling if still active
        }
      } catch (err) {
        console.error('Error checking design status:', err);
        isPolling = false;
        setError(err instanceof Error ? err.message : 'Failed to check design status');
        setIsGenerating(false);
      }
    };

    // Start polling
    console.log('Starting status polling for task:', taskId);
    await poll();
  };

  const handleRetry = () => {
    if (taskId) {
      setError('');
      setIsGenerating(true);
      setRetryCount(0);
      pollDesignStatus(taskId);
    }
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
                    <p className="text-gray-600">Generating your design...</p>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                  <div className="text-center mb-4">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-500">{error}</p>
                    <button
                      onClick={handleRetry}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Retry
                    </button>
                  </div>
                </div>
              )}
              
              <Scene color={color} designTexture={designTexture} />
            </div>

            {/* Controls */}
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-medium mb-4">Design Options</h2>
                <PromptInput onGenerate={handleGenerateDesign} disabled={isGenerating} />
              </div>

              <div>
                <h3 className="text-md font-medium mb-3">T-Shirt Color</h3>
                <ColorPicker color={color} onChange={setColor} />
              </div>

              <div>
                <h3 className="text-md font-medium mb-3">Size</h3>
                <SizeSelector size={size} onChange={setSize} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}