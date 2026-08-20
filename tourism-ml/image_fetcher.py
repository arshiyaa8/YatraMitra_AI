import os
import sys
import json
import argparse
import requests
from datetime import datetime

class MonumentImageFetcher:
    """Fetches real-time or recent images of monuments from open APIs."""
    
    def __init__(self, save_dir: str):
        self.save_dir = save_dir
        if not os.path.exists(self.save_dir):
            os.makedirs(self.save_dir)

    def fetch_wikimedia_image(self, monument_name: str) -> str:
        """
        Searches Wikimedia Commons for a recent image of the given monument
        and downloads it to the local temporary directory.
        """
        # 1. Search for the monument image file name
        search_url = "https://en.wikipedia.org/w/api.php"
        search_params = {
            "action": "query",
            "format": "json",
            "titles": monument_name,
            "prop": "images",
            "imlimit": 1
        }
        
        try:
            res = requests.get(search_url, params=search_params, timeout=10)
            data = res.json()
            
            pages = data.get("query", {}).get("pages", {})
            page = list(pages.values())[0]
            images = page.get("images", [])
            
            if not images:
                return None
                
            file_title = images[0]["title"]
            
            # 2. Get the actual download URL for the image file
            imageinfo_params = {
                "action": "query",
                "format": "json",
                "titles": file_title,
                "prop": "imageinfo",
                "iiprop": "url"
            }
            
            info_res = requests.get(search_url, params=imageinfo_params, timeout=10)
            info_data = info_res.json()
            
            info_pages = info_data.get("query", {}).get("pages", {})
            info_page = list(info_pages.values())[0]
            image_url = info_page["imageinfo"][0]["url"]
            
            # 3. Download and save the image
            img_data = requests.get(image_url, timeout=10).content
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_name = monument_name.replace(" ", "_").lower()
            file_path = os.path.join(self.save_dir, f"{safe_name}_{timestamp}.jpg")
            
            with open(file_path, "wb") as handler:
                handler.write(img_data)
                
            return file_path
            
        except Exception as e:
            return None

def main():
    parser = argparse.ArgumentParser(description="Monument Image Fetcher")
    parser.add_argument("--monument", type=str, required=True, help="Name of the monument")
    args = parser.parse_args()

    save_directory = os.path.join(os.path.dirname(__file__), "temp_images")
    fetcher = MonumentImageFetcher(save_dir=save_directory)
    
    downloaded_path = fetcher.fetch_wikimedia_image(args.monument)
    
    if downloaded_path:
        print(json.dumps({"status": "success", "image_path": downloaded_path}))
    else:
        print(json.dumps({"status": "error", "message": "No image found or download failed."}))

if __name__ == "__main__":
    main()