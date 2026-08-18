import requests
import xml.etree.ElementTree as ET

def get_disaster_alerts():
    url = "https://sachet.ndma.gov.in/CapFeed"

    try:
        # Try to contact the NDMA API
        response = requests.get(url, timeout=10)

        # Check if the server returned an error
        response.raise_for_status()

        # Try to read the XML data
        root = ET.fromstring(response.content)

        alerts = []

        for item in root.iter("item"):
            title_element = item.find("title")

            if title_element is not None:
                alerts.append(title_element.text)

        return alerts

    except requests.exceptions.Timeout:
        print("Disaster alert service timed out.")
        return []

    except requests.exceptions.RequestException as e:
        print(f"Could not connect to disaster alert service: {e}")
        return []

    except ET.ParseError:
        print("Received invalid XML data from disaster alert service.")
        return []

    except Exception as e:
        print(f"Unexpected error: {e}")
        return []