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

  const poll = async () => {
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
            await loadImage(imageSource);
            
            setDesignTexture(imageSource);
            updateDesignWithHistory(imageSource);
            await saveDesignToHistory(imageSource);
            
            setDesignTransform(prev => ({
              ...prev,
              hasBackground: true,
              scale: 1,
              rotation: 0,
              position: { x: 0, y: 0 }
            }));
            
            return true; // Success
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

      // Still processing
      retries++;
      if (retries >= maxRetries) {
        throw new Error('Design generation timed out');
      }

      // Update retry count for UI feedback
      setRetryCount(retries);
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
      return false; // Continue polling
    } catch (error) {
      console.error('Polling error:', error);
      throw error;
    }
  };

  try {
    while (retries < maxRetries) {
      const completed = await poll();
      if (completed) break;
    }
  } catch (error) {
    console.error('Final polling error:', error);
    setError(error instanceof Error ? error.message : 'Failed to generate design');
    setDesignTexture(null);
    setDesignTransform(prev => ({
      ...prev,
      hasBackground: true,
      scale: 1,
      rotation: 0,
      position: { x: 0, y: 0 }
    }));
  }
};

export const handleBackgroundToggle = async (
  designTexture: string | null,
  isLoading: boolean,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setDesignTexture: React.Dispatch<React.SetStateAction<string | null>>,
  setDesignTransform: React.Dispatch<React.SetStateAction<DesignTransform>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
) => {
  if (!designTexture || isLoading) return;

  setIsLoading(true);
  setError(null);

  try {
    const response = await removeBackground(designTexture);
    
    if (response.ok) {
      const result = await response.json();
      setDesignTexture(result.image_data);
      setDesignTransform(prev => ({
        ...prev,
        hasBackground: false
      }));
    } else {
      throw new Error('Failed to remove background');
    }
  } catch (error) {
    console.error('Background removal failed:', error);
    setError('Failed to remove background. Please try again.');
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

export const removeBackground = async (imageData: string): Promise<Response> => {
  // Convert base64/URL to blob
  let imageBlob: Blob;
  if (imageData.startsWith('data:')) {
    // Handle base64 data
    const base64Response = await fetch(imageData);
    imageBlob = await base64Response.blob();
  } else {
    // Handle URL
    const urlResponse = await fetch(imageData);
    imageBlob = await urlResponse.blob();
  }

  // Create form data
  const formData = new FormData();
  formData.append('image', imageBlob, 'design.png');

  // Send request to remove background
  return fetch(`${apiBaseUrl}/remove-background`, {
    method: 'POST',
    body: formData,
  });
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