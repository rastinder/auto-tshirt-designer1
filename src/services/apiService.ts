import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

const isDevelopment = import.meta.env.MODE === 'development';
const API_BASE_URL = isDevelopment ? 'http://localhost:8000' : 'https://aitshirts.in/api';
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 seconds
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => this.handleError(error)
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (retries > 0 && this.shouldRetry(error)) {
        console.log(`Retrying request. Attempts remaining: ${retries}`);
        await this.delay(RETRY_DELAY);
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  private shouldRetry(error: any): boolean {
    if (axios.isAxiosError(error)) {
      // Retry on network errors or 5xx server errors
      return !error.response || (error.response.status >= 500 && error.response.status < 600);
    }
    return false;
  }

  private handleError(error: AxiosError) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = (error.response.data as any)?.detail || 'An error occurred';
      
      switch (status) {
        case 404:
          throw new Error('API endpoint not found. Please check the server configuration.');
        case 502:
          throw new Error('Server is temporarily unavailable. Please try again in a few moments.');
        case 500:
          throw new Error('Internal server error. Please try again later.');
        default:
          throw new Error(message);
      }
    } else if (error.request) {
      // Request made but no response received
      throw new Error('Cannot connect to the server. Please check your internet connection and try again.');
    } else {
      // Error setting up the request
      throw new Error('Failed to make the request. Please try again.');
    }
  }

  public async get<T>(url: string): Promise<T> {
    return this.retryRequest(async () => {
      const response = await this.api.get<T>(url);
      return response.data;
    });
  }

  public async post<T>(url: string, data?: any): Promise<T> {
    return this.retryRequest(async () => {
      const response = await this.api.post<T>(url, data);
      return response.data;
    });
  }

  public async put<T>(url: string, data?: any): Promise<T> {
    return this.retryRequest(async () => {
      const response = await this.api.put<T>(url, data);
      return response.data;
    });
  }

  public async delete<T>(url: string): Promise<T> {
    return this.retryRequest(async () => {
      const response = await this.api.delete<T>(url);
      return response.data;
    });
  }

  public async checkHealth(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();
