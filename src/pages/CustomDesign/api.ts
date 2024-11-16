// This file is deprecated and will be removed in future versions.
// Please use DesignService from '../../services/designService' directly.

import { DesignService } from '../../services/designService';
import { DesignTransform } from './types';

// Proxy to DesignService for backward compatibility
export const generateDesign = DesignService.generateDesign;
export const removeBackground = DesignService.removeBackground;
export const adjustTransparency = DesignService.adjustTransparency;
export const loadDesigns = DesignService.loadPreviousDesigns;

export const saveDesign = async (design: {
  imageUrl: string;
  transform: DesignTransform;
  prompt: string;
}): Promise<string> => {
  await DesignService.saveDesignToHistory(design.imageUrl);
  return 'success';
};

export const healthCheck = DesignService.checkHealth;

// Functions for testing
export const checkLocalServer = async (): Promise<void> => {
  try {
    const isHealthy = await healthCheck();
    if (isHealthy) {
      console.log('API is available');
    } else {
      console.log('API is not available');
    }
  } catch (error) {
    console.log('API is not available');
  }
};

export const loadPreviousDesigns = async (
  setDesigns: (designs: string[]) => void,
  setLoading: (loading: boolean) => void
): Promise<void> => {
  try {
    setLoading(true);
    const designs = await loadDesigns();
    setDesigns(designs);
  } catch (error) {
    console.error('Error loading previous designs:', error);
    setDesigns([]);
  } finally {
    setLoading(false);
  }
};

export const handleGenerateDesign = async (
  prompt: string,
  setIsGenerating: (generating: boolean) => void,
  setError: (error: string | null) => void,
  setDesignTexture: (texture: string | null) => void
): Promise<void> => {
  try {
    setIsGenerating(true);
    setError(null);
    const designImage = await generateDesign(prompt);
    setDesignTexture(designImage);
  } catch (error) {
    console.error('Error generating design:', error);
    setError('Failed to generate design. Please try again.');
    setDesignTexture(null);
  } finally {
    setIsGenerating(false);
  }
};