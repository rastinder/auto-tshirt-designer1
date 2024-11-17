import { apiService } from './apiService';
import { DesignResponse, PromptTemplates, DesignTransform, DesignHistoryItem } from '../pages/CustomDesign/types';

const PROMPT_TEMPLATES: PromptTemplates = {
  prefix: "",
  suffix: ", professional product photography, centered composition, high quality",
  negative: "distorted, blurry, bad art, watermark, text, deformed, out of frame, cropped, low quality"
};

export class DesignService {
  static getInitialDesignTransform(): DesignTransform {
    return {
      hasBackground: true,
      texture: null,
      rotation: 0,
      scale: 1,
      position: { x: 0, y: 0 },
      x: 0,
      y: 0
    };
  }

  static async checkHealth(): Promise<boolean> {
    try {
      await apiService.get('/health');
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      // Try to connect to backup endpoint if main health check fails
      try {
        await apiService.get('/status');
        return true;
      } catch (backupError) {
        console.error('Backup health check failed:', backupError);
        return false;
      }
    }
  }

  static async loadDesignHistory(): Promise<DesignHistoryItem[]> {
    try {
      const history = await apiService.get<DesignHistoryItem[]>('/designs/history');
      return history;
    } catch (error) {
      console.error('Failed to load design history:', error);
      // Return empty array instead of throwing to prevent UI disruption
      return [];
    }
  }

  static async generateDesign(prompt: string): Promise<string> {
    try {
      const fullPrompt = `${PROMPT_TEMPLATES.prefix}${prompt}${PROMPT_TEMPLATES.suffix}`;
      const response = await apiService.post<DesignResponse>('/generate', {
        prompt: fullPrompt,
        style: "realistic",
        colors: [],
        size: "M",
        priority: 1
      });

      if (!response?.result?.image_data) {
        throw new Error('No image data received from the server');
      }

      return response.result.image_data;
    } catch (error) {
      console.error('Error generating design:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to generate design. Please try again later.');
    }
  }

  static async removeBackground(
    imageBase64: string,
    transparency: number = 0
  ): Promise<string> {
    try {
      // Remove data:image/... prefix if present
      const base64Data = imageBase64.includes('base64,')
        ? imageBase64.split('base64,')[1]
        : imageBase64;

      const response = await apiService.post<{ image: string }>('/remove-background', {
        image: base64Data,
        transparency,
        model: "u2net",
        return_mask: false
      });

      if (!response?.image) {
        throw new Error('No processed image received from the server');
      }

      return response.image;
    } catch (error) {
      console.error('Error removing background:', error);
      throw new Error('Failed to remove background');
    }
  }

  static async adjustTransparency(
    imageBase64: string,
    transparency: number
  ): Promise<string> {
    try {
      const base64Data = imageBase64.includes('base64,')
        ? imageBase64.split('base64,')[1]
        : imageBase64;

      const response = await apiService.post<{ image: string }>('/adjust-transparency', {
        image: base64Data,
        transparency
      });

      if (!response?.image) {
        throw new Error('No processed image received from the server');
      }

      return response.image;
    } catch (error) {
      console.error('Error adjusting transparency:', error);
      throw new Error('Failed to adjust transparency');
    }
  }

  static async saveDesignToHistory(imageData: string): Promise<void> {
    try {
      await apiService.post('/designs/save', { image_data: imageData });
    } catch (error) {
      console.error('Failed to save design to history:', error);
      throw new Error('Failed to save design');
    }
  }

  static async urlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting URL to base64:', error);
      throw new Error('Failed to convert image');
    }
  }
}
