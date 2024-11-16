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
  rotation: number;
  scale: number;
  position: { x: number; y: number };
  x: number;
  y: number;
}

export interface DesignHistoryItem {
  id: string;
  image_data: string;
  prompt?: string;
  created_at: string;
  transform?: DesignTransform;
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