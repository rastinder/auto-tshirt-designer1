// types.ts
export interface DesignResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: {
    image_data: string;
    image_url?: string;
    error?: string;
  };
}

export interface DesignTransform {
  hasBackground: boolean;
  texture: string | null;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  originalWidth: number;
  originalHeight: number;
  position: { x: number; y: number };
}

export interface CropConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: '%' | 'px';
  aspect?: number;
}

export interface CartItem {
  design: string;
  color: string;
  size: string;
  timestamp: string;
}

export interface ColorMap {
  [key: string]: string;
}

export interface PromptTemplates {
  prefix: string;
  suffix: string;
  negative: string;
}