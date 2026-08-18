import requests

def get_weather(lat, lon):
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": "T2M,PRECTOTCORR",  # temperature, rainfall
        "community": "RE",
        "longitude": lon,
        "latitude": lat,
        "start": "20260801",
        "end": "20260818",
        "format": "JSON"
    }
    response = requests.get(url, params=params)
    return response.json()