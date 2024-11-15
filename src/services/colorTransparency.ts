/**
 * Service for handling color transparency operations using local FastAPI server
 */

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || (window.location.origin.includes('localhost') 
    ? 'http://localhost:8000' 
    : `${window.location.origin}/api`);

/**
 * Applies color transparency to an image
 * @param imageUrl - URL or Base64 of the image to process
 * @param color - Color to make transparent (hex format)
 * @param tolerance - Color tolerance (0-1)
 * @returns Promise with the processed image as a blob URL
 */
export async function applyColorTransparency(
    imageUrl: string,
    color: string,
    tolerance: number = 0.5
): Promise<string> {
    try {
        let imageBlob: Blob;
        
        // Handle base64 image data
        if (imageUrl.startsWith('data:')) {
            // Convert base64 to blob directly
            const base64Response = await fetch(imageUrl);
            imageBlob = await base64Response.blob();
        } else {
            // Handle regular URL
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                throw new Error('Failed to fetch image');
            }
            imageBlob = await imageResponse.blob();
        }

        // Create form data for the API request
        const formData = new FormData();
        formData.append('file', imageBlob, 'design.png');
        formData.append('color', color.replace('#', '')); // Remove # from color
        formData.append('tolerance', tolerance.toString());

        // Make the API request to our local server
        const response = await fetch(`${API_URL}/color_transparency`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: {
                'Accept': 'image/png'
            }
        });

        if (!response.ok) {
            let errorMessage;
            try {
                const errorText = await response.text();
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.detail || 'Failed to apply color transparency';
            } catch {
                errorMessage = 'Server error: Failed to apply color transparency';
            }
            throw new Error(errorMessage);
        }

        // Get the processed image and create a blob URL
        const processedImageBlob = await response.blob();
        return URL.createObjectURL(processedImageBlob);
    } catch (error: any) {
        console.error('Color transparency error:', error);
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('Server connection failed. Please make sure the server is running on http://localhost:8000');
        }
        throw new Error(error.message || 'Failed to apply color transparency');
    }
}
