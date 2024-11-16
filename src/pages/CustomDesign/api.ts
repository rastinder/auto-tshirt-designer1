// api.ts
import { DesignTransform, DesignResponse } from './types'; // You will need to create a types.ts file with the interface definitions
import { debounce } from 'lodash';

const PROMPT_TEMPLATES = {
  prefix: "",
  suffix: ", professional product photography, centered composition, high quality",
  negative: "distorted, blurry, bad art, watermark, text, deformed, out of frame, cropped, low quality"
};

const isDevelopment = import.meta.env.DEV;
const apiBaseUrl = isDevelopment ? 'http://localhost:8000' : 'https://aitshirts.in/api';

export const checkLocalServer = async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/`);
    if (response.ok) {
      console.log('API is available');
      return true;
    } else {
      console.error('API returned status:', response.status);
      return false;
    }
  } catch (err) {
    console.error('API is not available:', err);
    return false;
  }
};

export const loadPreviousDesigns = async (setPreviousDesigns: React.Dispatch<React.SetStateAction<string[]>>, setIsLoadingHistory: React.Dispatch<React.SetStateAction<boolean>>) => {
  setIsLoadingHistory(true);
  try {
    const response = await fetch(`${apiBaseUrl}/previous-designs`);
    if (response.ok) {
      const designs = await response.json();
      setPreviousDesigns(designs);
      console.log('Loaded previous designs:', designs);
    } else {
      console.error('Failed to load previous designs. Status:', response.status);
      throw new Error(`Failed to load previous designs: ${response.statusText}`);
    }
  } catch (err) {
    console.error('Failed to load previous designs:', err);
    setPreviousDesigns([]);
  } finally {
    setIsLoadingHistory(false);
  }
};

export const saveDesignToHistory = async (imageData: string) => {
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
  } catch (err) {
    console.error('Failed to save design to history:', err);
  }
};

export const handleGenerateDesign = async (
  prompt: string,
  color: string,
  setTaskId: React.Dispatch<React.SetStateAction<string | null>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setDesignTransform: React.Dispatch<React.SetStateAction<DesignTransform>>,
  setDesignTexture: React.Dispatch<React.SetStateAction<string | null>>,
  setRetryCount: React.Dispatch<React.SetStateAction<number>>,
  saveDesignToHistory: (imageData: string) => Promise<void>,
  updateDesignWithHistory: (newDesign: string | null) => void
) => {
  setIsGenerating(true);
  setError(null);
  
  try {
    const formattedPrompt = formatPrompt(prompt, color);
    console.log('Generating design with prompt:', formattedPrompt);

    const response = await fetch(`${apiBaseUrl}/design`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: formattedPrompt,
        color: color,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Design generation failed. Status:', response.status, 'Error:', errorText);
      throw new Error(`Failed to generate design: ${response.statusText}`);
    }

    const data: DesignResponse = await response.json();
    setTaskId(data.task_id);
    
    // Start polling for the design status
    pollDesignStatus(
      data.task_id,
      setDesignTransform,
      setDesignTexture,
      setError,
      setRetryCount,
      saveDesignToHistory,
      updateDesignWithHistory
    );
  } catch (err) {
    console.error('Error generating design:', err);
    setError(err instanceof Error ? err.message : 'Failed to generate design');
    setIsGenerating(false);
  }
};

export const pollDesignStatus = async (
  taskId: string,
  setDesignTransform: React.Dispatch<React.SetStateAction<DesignTransform>>,
  setDesignTexture: React.Dispatch<React.SetStateAction<string | null>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setRetryCount: React.Dispatch<React.SetStateAction<number>>,
  saveDesignToHistory: (imageData: string) => Promise<void>,
  updateDesignWithHistory: (newDesign: string | null) => void
) => {
  const maxRetries = 30;
  let retries = 0;

  const loadImage = (imageSource: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageSource;
    });
  };

  while (retries < maxRetries) {
    try {
      const response = await fetch(`${apiBaseUrl}/status/${taskId}`);
      if (!response.ok) {
        throw new Error('Failed to get status');
      }

      const data = await response.json();
      console.log('Status response:', data);

      if (data.status === 'completed') {
        let imageSource = data.result?.image_url;
        
        if (imageSource && imageSource.startsWith('/')) {
          imageSource = `${apiBaseUrl}${imageSource}`;
        }
        
        if (!imageSource && data.result?.image_data) {
          imageSource = data.result.image_data.startsWith('data:') 
            ? data.result.image_data 
            : `data:image/png;base64,${data.result.image_data}`;
        }

        if (imageSource) {
          try {
            console.log('Loading image:', imageSource);
            const img = await loadImage(imageSource);
            
            console.log('Image loaded successfully, dimensions:', img.width, 'x', img.height);
            
            // Calculate scaled dimensions to fit within max size
            const maxSize = 300;
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const scaledWidth = Math.round(img.width * scale);
            const scaledHeight = Math.round(img.height * scale);
            
            setDesignTexture(imageSource);
            updateDesignWithHistory(imageSource);
            await saveDesignToHistory(imageSource);
            
            setDesignTransform(prev => ({
              ...prev,
              hasBackground: true,
              width: scaledWidth,
              height: scaledHeight,
              originalWidth: img.width,
              originalHeight: img.height,
              scale: scale,
              position: { x: 0, y: 0 }
            }));
            
            return; // Success - exit the polling loop
          } catch (imgError) {
            console.error('Image loading failed:', imgError);
            throw new Error('Failed to load the generated image');
          }
        } else {
          throw new Error('No image data received');
        }
      } else if (data.status === 'failed') {
        throw new Error(data.error || 'Design generation failed');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
      setRetryCount(retries);
    } catch (err) {
      console.error('Error polling status:', err);
      setError(err instanceof Error ? err.message : 'Failed to get design status');
      break;
    }
  }

  if (retries >= maxRetries) {
    setError('Design generation timed out. Please try again.');
  }
};

export const handleBackgroundToggle = async (designTexture: string | null, isLoading: boolean, setIsLoading: React.Dispatch<React.SetStateAction<boolean>>, setDesignTexture: React.Dispatch<React.SetStateAction<string | null>>, setDesignTransform: React.Dispatch<React.SetStateAction<DesignTransform>>, setError: React.Dispatch<React.SetStateAction<string | null>>) => {
  if (!designTexture || isLoading) return;

  try {
    setIsLoading(true);
    let formData = new FormData();
    
    // Handle both URL and base64 data
    if (designTexture.startsWith('data:')) {
      // If it's base64 data, convert it to a blob
      const response = await fetch(designTexture);
      const blob = await response.blob();
      formData.append('file', blob);
    } else {
      // If it's a URL, fetch it first
      const response = await fetch(designTexture);
      const blob = await response.blob();
      formData.append('file', blob);
    }

    const response = await fetch(`${apiBaseUrl}/remove-background`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to remove background');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    updateDesignWithHistory(url);
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

export const handleTransparencyChange = async (designTexture: string | null, selectedColor: string, transparency: number, setIsLoading: React.Dispatch<React.SetStateAction<boolean>>, setError: React.Dispatch<React.SetStateAction<string | null>>, setDesignTexture: React.Dispatch<React.SetStateAction<string | null>>) => {
  if (!designTexture || !selectedColor) return;

  setIsLoading(true);
  setError(null);

  try {
    let formData = new FormData();
    
    // Handle both URL and base64 data
    if (designTexture.startsWith('data:')) {
      // If it's base64 data, convert it to a blob
      const response = await fetch(designTexture);
      const blob = await response.blob();
      formData.append('file', blob);
    } else {
      // If it's a URL, fetch it first
      const response = await fetch(designTexture);
      const blob = await response.blob();
      formData.append('file', blob);
    }

    formData.append('color', selectedColor);
    formData.append('tolerance', (transparency / 100).toString());

    const response = await fetch(`${apiBaseUrl}/color_transparency`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to apply transparency: ${response.statusText}`);
    }

    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);
    setDesignTexture(imageUrl);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to apply transparency');
    console.error('Error applying transparency:', err);
  } finally {
    setIsLoading(false);
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

export const updateDesignWithHistory = (setDesignHistory: React.Dispatch<React.SetStateAction<string[]>>, setDesignTexture: React.Dispatch<React.SetStateAction<string | null>>, designTexture: string | null, newDesign: string | null) => {
  if (designTexture) {
    setDesignHistory(prev => [...prev, designTexture]);
  }
  setDesignTexture(newDesign);
};