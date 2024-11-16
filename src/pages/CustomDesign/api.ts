// api.ts
import { DesignTransform, DesignResponse } from './types'; // You will need to create a types.ts file with the interface definitions
import { debounce } from 'lodash';

const PROMPT_TEMPLATES = {
  prefix: "",
  suffix: ", professional product photography, centered composition, high quality",
  negative: "distorted, blurry, bad art, watermark, text, deformed, out of frame, cropped, low quality"
};

const isDevelopment = import.meta.env.MODE === 'production' ? false : true;
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

export const generateDesign = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch(`${apiBaseUrl}/generate-design`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate design: ${response.status}`);
    }

    const data = await response.json();
    return data.image_url;
  } catch (error) {
    console.error('Design generation error:', error);
    throw error;
  }
};

export const removeBackground = async (imageUrl: string, transparency: number = 0): Promise<string> => {
  try {
    // Convert image URL to base64
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    // Send base64 image to API
    const apiResponse = await fetch(`${apiBaseUrl}/remove-background`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64.split(',')[1], // Remove data:image/... prefix
        transparency: transparency
      }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => null);
      throw new Error(errorData?.detail || `Failed to remove background: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    return data.processed_image_url;
  } catch (error) {
    console.error('Background removal error:', error);
    throw error;
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
    const response = await generateDesign(prompt);

    setDesignTexture(response);
    updateDesignWithHistory(response);
    await saveDesignToHistory(response);
    
    setDesignTransform(prev => ({
      ...prev,
      hasBackground: true,
      scale: 1,
      rotation: 0,
      position: { x: 0, y: 0 }
    }));
  } catch (err) {
    console.error('Error generating design:', err);
    setError(err instanceof Error ? err.message : 'Failed to generate design');
    setIsGenerating(false);
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

export const updateDesignWithHistory = (setDesignHistory: React.Dispatch<React.SetStateAction<string[]>>, setDesignTexture: React.Dispatch<React.SetStateAction<string | null>>, designTexture: string | null, newDesign: string | null) => {
  if (designTexture) {
    setDesignHistory(prev => [...prev, designTexture]);
  }
  setDesignTexture(newDesign);
};