// api.ts
import { DesignTransform, DesignResponse } from './types'; // You will need to create a types.ts file with the interface definitions
import { debounce } from 'lodash';

const PROMPT_TEMPLATES = {
  prefix: "",
  suffix: ", professional product photography, centered composition, high quality",
  negative: "distorted, blurry, bad art, watermark, text, deformed, out of frame, cropped, low quality"
};

const isDevelopment = import.meta.env.DEV;
const apiBaseUrl = isDevelopment ? 'http://localhost:8000' : '/api';

export const checkLocalServer = async () => {
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

export const loadPreviousDesigns = async (setPreviousDesigns: React.Dispatch<React.SetStateAction<string[]>>, setIsLoadingHistory: React.Dispatch<React.SetStateAction<boolean>>) => {
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

export const handleGenerateDesign = async (prompt: string, color: string, setTaskId: React.Dispatch<React.SetStateAction<string | null>>, setError: React.Dispatch<React.SetStateAction<string | null>>, setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>) => {
  const formattedPrompt = formatPrompt(prompt, color);
  setIsGenerating(true);
  setError('');
  try {
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
      await pollDesignStatus(data.task_id, setDesignTransform, setDesignTexture, setError, setRetryCount, saveDesignToHistory, updateDesignWithHistory);
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

export const pollDesignStatus = async (taskId: string, setDesignTransform: React.Dispatch<React.SetStateAction<DesignTransform>>, setDesignTexture: React.Dispatch<React.SetStateAction<string | null>>, setError: React.Dispatch<React.SetStateAction<string | null>>, setRetryCount: React.Dispatch<React.SetStateAction<number>>, saveDesignToHistory: (imageData: string) => Promise<void>, updateDesignWithHistory: (newDesign: string | null) => void) => {
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

      if (data.status === 'completed') {
        const imageSource = data.result?.image_url || data.result?.image_data;
        if (imageSource) {
          updateDesignWithHistory(imageSource);
          await saveDesignToHistory(imageSource);
          setDesignTransform(prev => ({
            ...prev,
            hasBackground: false
          }));
          return;
        } else {
          throw new Error('No image data received');
        }
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