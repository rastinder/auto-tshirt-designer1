const API_URL = '/api'; // Use relative path
const WS_URL = '/ws'; // Use relative path for WebSocket

export interface DesignRequest {
  prompt: string;
  style?: string;
  priority?: number;
}

export interface DesignResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  image_url?: string;
  error?: string;
}

export async function generateDesign(
  request: DesignRequest
): Promise<DesignResponse> {
  try {
    const response = await fetch(`${API_URL}/design`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Design generation error:', error);
    throw error;
  }
}

export async function checkDesignStatus(
  taskId: string
): Promise<DesignResponse> {
  try {
    const response = await fetch(`${API_URL}/status/${taskId}`, {
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Status check error:', error);
    throw error;
  }
}

export async function checkServerStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/`, {
      credentials: 'same-origin',
    });
    return response.ok;
  } catch (error) {
    console.error('Server status check error:', error);
    return false;
  }
}