/**
 * Service for handling background removal operations using local FastAPI server
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
            mode: 'cors',
            credentials: 'include',
            headers: {
                'Accept': 'image/png',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.detail || 'Failed to remove background';
            } catch {
                errorMessage = errorText || 'Failed to remove background';
            }
            throw new Error(errorMessage);
        }

        // Get the processed image and create a blob URL
        const processedImageBlob = await response.blob();
        return URL.createObjectURL(processedImageBlob);
    } catch (error: any) {
        console.error('Background removal error:', error);
        throw new Error(error.message || 'Failed to remove background');
    }
}
