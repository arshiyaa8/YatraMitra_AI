"""
image_fetcher.py — Wikimedia Commons Heritage Image Retrieval Utility

Queries the Wikimedia Commons API to search and fetch high-resolution, open-licensed
monument photography for local offline storage.
"""

import os
import sys
import json
import argparse
import requests
from datetime import datetime

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "tourism-ml/1.0 (tourism image fetcher)"}


class MonumentImageFetcher:
    """Fetches and downloads verified Wikimedia Commons heritage imagery."""

    def __init__(self, save_dir: str):
        self.save_dir = save_dir
        os.makedirs(self.save_dir, exist_ok=True)

    def fetch_wikimedia_image(self, monument_name: str):
        try:
            search_params = {
                "action": "query",
                "format": "json",
                "generator": "search",
                "gsrsearch": f"{monument_name} filetype:bitmap",
                "gsrnamespace": 6,
                "gsrlimit": 5,
                "prop": "imageinfo",
                "iiprop": "url|mime",
                "iiurlwidth": 1600,
            }
            res = requests.get(COMMONS_API, params=search_params, headers=HEADERS, timeout=15)
            res.raise_for_status()
            data = res.json()
            pages = data.get("query", {}).get("pages", {})

            image_url = None
            for page in pages.values():
                infos = page.get("imageinfo", [])
                if infos:
                    image_url = infos[0].get("thumburl") or infos[0].get("url")
                    if image_url:
                        break

            if not image_url:
                return None

            image_res = requests.get(image_url, headers=HEADERS, timeout=20)
            image_res.raise_for_status()

            content_type = image_res.headers.get("Content-Type", "").lower()
            if not content_type.startswith("image/"):
                return None

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_name = "".join(c if c.isalnum() else "_" for c in monument_name).strip("_").lower()
            ext = ".jpg"
            if "png" in content_type:
                ext = ".png"
            elif "webp" in content_type:
                ext = ".webp"

            file_path = os.path.join(self.save_dir, f"{safe_name}_{timestamp}{ext}")
            with open(file_path, "wb") as handler:
                handler.write(image_res.content)
            return file_path

        except (requests.RequestException, ValueError, KeyError, OSError):
            return None


def main():
    parser = argparse.ArgumentParser(description="Monument Image Fetcher")
    parser.add_argument("--monument", type=str, required=True, help="Name of the monument")
    args = parser.parse_args()

    save_directory = os.path.join(os.path.dirname(__file__), "temp_images")
    path = MonumentImageFetcher(save_directory).fetch_wikimedia_image(args.monument)

    if path:
        print(json.dumps({"status": "success", "image_path": path}))
    else:
        print(json.dumps({"status": "error", "message": "No image found or download failed."}))


if __name__ == "__main__":
    main()
