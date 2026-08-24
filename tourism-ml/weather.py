"""
weather.py — NASA POWER Meteorological Point Query Utility

Fetches daily surface temperature (T2M) and precipitation (PRECTOTCORR)
for geographical latitude/longitude coordinates via NASA POWER API.
"""

import requests


def get_weather(lat, lon):
    """
    Fetches NASA POWER meteorological dataset for given GPS coordinates.

    :param lat: Latitude
    :param lon: Longitude
    :return: Parsed JSON response from NASA POWER API
    """
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": "T2M,PRECTOTCORR",  # Temperature and precipitation metrics
        "community": "RE",
        "longitude": lon,
        "latitude": lat,
        "start": "20260801",
        "end": "20260818",
        "format": "JSON"
    }
    response = requests.get(url, params=params)
    return response.json()