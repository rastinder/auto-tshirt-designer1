import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

const isDevelopment = import.meta.env.MODE === 'development';
const API_BASE_URL = isDevelopment ? 'http://localhost:8000' : 'https://aitshirts.in/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => this.handleError(error)
    );
  }

  private handleError(error: AxiosError) {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = (error.response.data as any)?.detail || 'An error occurred';
      
      switch (status) {
        case 404:
          throw new Error('API endpoint not found. Please check the server configuration.');
        case 500:
          throw new Error('Internal server error. Please try again later.');
        default:
          throw new Error(message);
      }
    } else if (error.request) {
      // Request made but no response received
      throw new Error('Cannot connect to the server. Please check if the backend is running.');
    } else {
      // Error setting up the request
      throw new Error('Failed to make the request. Please try again.');
    }
  }

  public async get<T>(url: string): Promise<T> {
    const response = await this.api.get<T>(url);
    return response.data;
  }

  public async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.post<T>(url, data);
    return response.data;
  }

  public async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.put<T>(url, data);
    return response.data;
  }

  public async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete<T>(url);
    return response.data;
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
