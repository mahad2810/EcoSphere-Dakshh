import streamlit as st
import requests
import pandas as pd
import datetime

# --- Data Provenance Registry ---
DATA_SOURCES = {
    "Air Quality": {
        "Provider": "Open-Meteo (CAMS / ECMWF)",
        "Link": "https://open-meteo.com/en/docs/air-quality-api",
        "Method": "Satellite-model fusion (Near Real-Time)",
        "License": "CC BY 4.0"
    },
    "Soil Moisture": {
        "Provider": "Open-Meteo (ERA5-Land Archive)",
        "Link": "https://open-meteo.com/en/docs/historical-weather-api",
        "Method": "Reanalysis Dataset (Satellite + In-situ sensors)",
        "License": "Copernicus License"
    },
    "Sea Temperature": {
        "Provider": "Copernicus Marine Service / Open-Meteo",
        "Link": "https://marine.copernicus.eu/",
        "Method": "NEMO-based Ocean Physics Analysis",
        "License": "EU Copernicus"
    },
    "GHG Emissions": {
        "Provider": "WRI Climate Watch (CAIT)",
        "Link": "https://www.climatewatchdata.org/",
        "Method": "Historical Emissions Analysis by Sector",
        "License": "WRI Open Data"
    }
}

def get_data_source_info(category):
    return DATA_SOURCES.get(category, {"Provider": "Local Dataset", "Link": "#", "Method": "Processed CSV"})


@st.cache_data(ttl=3600)
def fetch_air_quality(lat, lon):
    """
    Fetch real-time air quality data from Open-Meteo Air Quality API.
    Does not require an API key for non-commercial use.
    """
    try:
        url = f"https://air-quality-api.open-meteo.com/v1/air-quality"
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone",
            "timezone": "auto"
        }
        res = requests.get(url, params=params, timeout=10)
        if res.status_code == 200:
            return res.json().get('current', {})
    except Exception as e:
        print(f"Air Quality API error: {e}")
    return {}

@st.cache_data(ttl=3600*24)
def fetch_city_coords(city_name):
    try:
        url = f"https://geocoding-api.open-meteo.com/v1/search"
        params = {"name": city_name, "count": 1, "language": "en", "format": "json"}
        res = requests.get(url, params=params, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data.get('results'):
                return data['results'][0]['latitude'], data['results'][0]['longitude']
    except Exception as e:
        print(f"Geocoding API error: {e}")
    return None, None

@st.cache_data(ttl=3600*24)
def fetch_soil_moisture(lat=20.5937, lon=78.9629, past_days=90):
    """
    Fetch historical and current soil moisture data from Open-Meteo Archive API.
    Uses ERA5-Land variables.
    """
    try:
        # Calculate dates for archive API
        end_date = datetime.date.today() - datetime.timedelta(days=2) # Archive usually lags by 2 days
        start_date = end_date - datetime.timedelta(days=past_days)
        
        url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date.strftime('%Y-%m-%d'),
            "end_date": end_date.strftime('%Y-%m-%d'),
            "hourly": "soil_moisture_7_to_28cm",
            "timezone": "auto"
        }
        res = requests.get(url, params=params, timeout=10)
        if res.status_code == 200:
            data = res.json().get('hourly', {})
            if 'time' in data and 'soil_moisture_7_to_28cm' in data:
                df = pd.DataFrame({
                    'Date': pd.to_datetime(data['time']),
                    'Avg_smlvl_at15cm': data['soil_moisture_7_to_28cm']
                })
                # Resample hourly to daily mean
                df = df.dropna().set_index('Date').resample('D').mean().reset_index()
                return df
    except Exception as e:
        print(f"Soil Moisture API error: {e}")
    
    # Fallback to forecast API for current days if archive fails or doesn't cover
    try:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "soil_moisture_9_to_27cm",
            "past_days": past_days,
            "timezone": "auto"
        }
        res = requests.get(url, params=params, timeout=10)
        if res.status_code == 200:
            data = res.json().get('hourly', {})
            if 'time' in data and 'soil_moisture_9_to_27cm' in data:
                df = pd.DataFrame({
                    'Date': pd.to_datetime(data['time']),
                    'Avg_smlvl_at15cm': data['soil_moisture_9_to_27cm']
                })
                df = df.dropna().set_index('Date').resample('D').mean().reset_index()
                return df
    except:
        pass
        
    return pd.DataFrame()

@st.cache_data(ttl=3600*24)
def fetch_sea_temperature(lat=0.0, lon=0.0, past_days=90):
    """
    Fetch ocean surface temperature using Open-Meteo Marine API.
    Covering broader regions than the local NetCDF subset.
    """
    try:
        # Check if coordinates are within Atlantic/Global range for Open-Meteo
        url = "https://marine-api.open-meteo.com/v1/marine"
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": "ocean_temperature_2m_mean",
            "past_days": past_days,
            "timezone": "auto"
        }
        res = requests.get(url, params=params, timeout=10)
        if res.status_code == 200:
            data = res.json().get('daily', {})
            if 'time' in data and 'ocean_temperature_2m_mean' in data:
                return pd.DataFrame({
                    'Date': pd.to_datetime(data['time']),
                    'Temperature (°C)': data['ocean_temperature_2m_mean']
                })
    except Exception as e:
        print(f"Marine API error: {e}")
    return pd.DataFrame()

@st.cache_data(ttl=3600*24)
def fetch_ghg_emissions(iso_code="WLD"):
    """
    Fetch Historical GHG emissions data using Climate Watch API bounds.
    Fails gracefully to empty response if endpoint structure changes or rate limits hit.
    """
    try:
        # Note: The actual Climate Watch API requires pagination and specific payload formats.
        # This provides a structured entry point that gracefully degrades if direct access fails.
        url = f"https://www.climatewatchdata.org/api/v1/data/historical_emissions"
        params = {"regions": iso_code}
        res = requests.get(url, params=params, timeout=10)
        if res.status_code == 200:
            return pd.DataFrame(res.json().get('data', []))
    except Exception as e:
        print(f"Climate Watch API error: {e}")
    return pd.DataFrame()
