/**
 * Service for handling background removal operations using local FastAPI server
 */

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || window.location.origin.includes('localhost') 
    ? 'http://localhost:8000' 
    : `${window.location.origin}/api`;

/**
 * Removes the background from an image using the local FastAPI server
 * @param imageUrl - URL or Base64 of the image to process
 * @returns Promise with the processed image as a blob URL
 */
export async function removeBackground(imageUrl: string): Promise<string> {
    try {
        // Convert the image URL/Base64 to a blob
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error('Failed to fetch image');
        }
        const imageBlob = await imageResponse.blob();

        // Create form data for the API request
        const formData = new FormData();
        formData.append('file', imageBlob, 'design.png');

        // Make the API request to our local server
        const response = await fetch(`${API_URL}/remove-background`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'image/png',
            },
        });

        if (!response.ok) {
            let errorMessage;
            try {
                const errorText = await response.text();
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.detail || 'Failed to remove background';
            } catch {
                errorMessage = 'Server error: Failed to remove background';
            }
            throw new Error(errorMessage);
        }

        // Get the processed image and create a blob URL
        const processedImageBlob = await response.blob();
        return URL.createObjectURL(processedImageBlob);
    } catch (error: any) {
        console.error('Background removal error:', error);
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('Server connection failed. Please make sure the server is running on http://localhost:8000');
        }
        throw new Error(error.message || 'Failed to remove background');
    }
}
