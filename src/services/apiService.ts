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
      timeout: 120000, // 120 seconds
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

  private handleError(error: AxiosError): never {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. The server is taking longer than expected to respond. Please try again.');
    }
    
    if (!error.response) {
      throw new Error('Cannot connect to the server. Please check your internet connection and try again.');
    }

    const status = error.response.status;
    const message = error.response.data?.detail || error.message;

    switch (status) {
      case 400:
        throw new Error(`Invalid request: ${message}`);
      case 401:
        throw new Error('Unauthorized. Please log in again.');
      case 403:
        throw new Error('Access denied. You do not have permission to perform this action.');
      case 404:
        throw new Error('Resource not found.');
      case 429:
        throw new Error('Too many requests. Please try again later.');
      case 500:
        throw new Error('Server error. Please try again later.');
      default:
        throw new Error(`An error occurred: ${message}`);
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

  public async postFormData<T>(url: string, formData: FormData): Promise<T> {
    return this.retryRequest(async () => {
      const response = await this.api.post<T>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
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
