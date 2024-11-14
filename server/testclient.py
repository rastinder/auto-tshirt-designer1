import aiohttp
import asyncio
import io
import time
from PIL import Image
from tqdm.asyncio import tqdm

API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-3.5-large"
headers = {"Authorization": "Bearer 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"}

async def query(payload):
    TOTAL_STEPS = 100
    EXPECTED_TIME = 120  # Increased to 120 seconds
    
    # Configure longer timeouts for the client session
    timeout = aiohttp.ClientTimeout(
        total=EXPECTED_TIME,
        connect=60,
        sock_connect=60,
        sock_read=EXPECTED_TIME
    )
    
    async with aiohttp.ClientSession(timeout=timeout) as session:
        start_time = time.time()
        
        with tqdm(total=TOTAL_STEPS, desc="Generating image", unit="steps") as pbar:
            try:
                async with session.post(API_URL, headers=headers, json=payload) as response:
                    if response.status == 503:
                        print("\nModel is loading. Please wait...")
                    
                    while True:
                        elapsed_time = time.time() - start_time
                        expected_progress = int((elapsed_time / EXPECTED_TIME) * TOTAL_STEPS)
                        current_step = min(expected_progress, TOTAL_STEPS - 1)
                        
                        steps_to_update = current_step - pbar.n
                        if steps_to_update > 0:
                            pbar.update(steps_to_update)
                        pbar.set_postfix_str(f"Elapsed: {elapsed_time:.1f}s")
                        
                        # Check response status first
                        if response.status != 200:
                            error_text = await response.text()
                            print(f"\nAPI Error (Status {response.status}): {error_text}")
                            return None
                        
                        # Try to read the response
                        try:
                            data = await response.content.read()
                            if data and len(data) > 0:
                                # Complete the progress bar
                                final_elapsed = time.time() - start_time
                                remaining_steps = TOTAL_STEPS - pbar.n
                                if remaining_steps > 0:
                                    pbar.update(remaining_steps)
                                pbar.set_postfix_str(f"Elapsed: {final_elapsed:.1f}s")
                                return data
                        except Exception as e:
                            print(f"\nError reading response: {e}")
                            return None
                        
                        await asyncio.sleep(0.1)
                        
                        # Check for timeout but with a warning first
                        if elapsed_time > EXPECTED_TIME - 10:  # Warning 10 seconds before timeout
                            print("\nWarning: Operation taking longer than expected...")
                        if elapsed_time > EXPECTED_TIME:
                            print("\nOperation timed out")
                            return None
                            
            except aiohttp.ClientError as e:
                print(f"\nNetwork error: {e}")
                return None
            except Exception as e:
                print(f"\nUnexpected error: {e}")
                return None

async def main():
    print("Starting image generation...")
    
    # First, check if model is loaded
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(API_URL) as response:
                if response.status == 503:
                    print("Model is loading. Waiting for model to initialize...")
                    await asyncio.sleep(20)  # Wait for model to load
        except Exception as e:
            print(f"Error checking model status: {e}")
    
    payload = {
        "inputs": "glaxy on black tshirt",
        "parameters": {
            "guidance_scale": 7.5,
            "negative_prompt": "blurry, distorted, low quality",
            "num_inference_steps": 30,
            "width": 1024,
            "height": 1024
        }
    }
    
    image_bytes = await query(payload)
    
    if image_bytes:
        try:
            image = Image.open(io.BytesIO(image_bytes))
            print("\nImage generated successfully! Displaying image...")
            image.show()
        except Exception as e:
            print(f"\nFailed to process image: {e}")
            print(f"Received data length: {len(image_bytes)}")
    else:
        print("\nNo image data received from the API.")

if __name__ == "__main__":
    asyncio.run(main())