import { apiService } from './apiService';
import { DesignResponse, PromptTemplates, DesignTransform } from '../pages/CustomDesign/types';

const PROMPT_TEMPLATES: PromptTemplates = {
  prefix: "",
  suffix: ", professional product photography, centered composition, high quality",
  negative: "distorted, blurry, bad art, watermark, text, deformed, out of frame, cropped, low quality"
};

export class DesignService {
  static async generateDesign(prompt: string): Promise<string> {
    const fullPrompt = `${PROMPT_TEMPLATES.prefix}${prompt}${PROMPT_TEMPLATES.suffix}`;
    const response = await apiService.post<DesignResponse>('/generate', {
      prompt: fullPrompt,
      negative_prompt: PROMPT_TEMPLATES.negative,
      num_inference_steps: 30,
      guidance_scale: 7.5,
    });

    if (!response.result?.image_data) {
      throw new Error('No image data received from the server');
    }

    return response.result.image_data;
  }

  static async removeBackground(
    imageBase64: string,
    transparency: number = 0
  ): Promise<string> {
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

    if (!response.image) {
      throw new Error('No processed image received from the server');
    }

    return response.image;
  }

  static async adjustTransparency(
    imageBase64: string,
    transparency: number
  ): Promise<string> {
    const base64Data = imageBase64.includes('base64,')
      ? imageBase64.split('base64,')[1]
      : imageBase64;

    const response = await apiService.post<{ image: string }>('/adjust-transparency', {
      image: base64Data,
      transparency
    });

    if (!response.image) {
      throw new Error('No processed image received from the server');
    }

    return response.image;
  }

  static async loadPreviousDesigns(): Promise<string[]> {
    try {
      const response = await apiService.get<string[]>('/designs/history');
      return response;
    } catch (error) {
      console.error('Failed to load design history:', error);
      return [];
    }
  }

  static async saveDesignToHistory(imageData: string): Promise<void> {
    try {
      await apiService.post('/designs/save', { image_data: imageData });
    } catch (error) {
      console.error('Failed to save design to history:', error);
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
      console.error('Failed to convert URL to base64:', error);
      throw new Error('Failed to process image. Please try again.');
    }
  }

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
}
