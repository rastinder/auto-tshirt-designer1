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