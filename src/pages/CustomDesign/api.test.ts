import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkLocalServer, loadPreviousDesigns, handleGenerateDesign } from './api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Functions', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('checkLocalServer', () => {
    it('should log success when server is available', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const consoleSpy = vi.spyOn(console, 'log');
      
      await checkLocalServer();
      
      expect(consoleSpy).toHaveBeenCalledWith('API is available');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should log failure when server is not available', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const consoleSpy = vi.spyOn(console, 'log');
      
      await checkLocalServer();
      
      expect(consoleSpy).toHaveBeenCalledWith('API is not available');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadPreviousDesigns', () => {
    const mockSetPreviousDesigns = vi.fn();
    const mockSetIsLoadingHistory = vi.fn();

    it('should load previous designs successfully', async () => {
      const mockDesigns = ['design1', 'design2'];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDesigns)
      });

      await loadPreviousDesigns(mockSetPreviousDesigns, mockSetIsLoadingHistory);

      expect(mockSetPreviousDesigns).toHaveBeenCalledWith(mockDesigns);
      expect(mockSetIsLoadingHistory).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when loading designs', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to load'));
      const consoleSpy = vi.spyOn(console, 'error');

      await loadPreviousDesigns(mockSetPreviousDesigns, mockSetIsLoadingHistory);

      expect(consoleSpy).toHaveBeenCalled();
      expect(mockSetIsLoadingHistory).toHaveBeenCalledTimes(2);
    });
  });
});
