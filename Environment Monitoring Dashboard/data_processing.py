import streamlit as st
import pandas as pd
import glob
import os
import pycountry

@st.cache_data(ttl=3600)
def load_aqi_data():
    """Load and process AQI data from Excel files"""
    data_path = os.path.dirname(os.path.abspath(__file__))
    aqi_data_list = []
    aqi_dir = os.path.join(data_path, 'AQIData')
    
    # Get all AQI city-level files
    aqi_files = glob.glob(os.path.join(aqi_dir, 'AQI_daily_city_level_*.xlsx'))
    
    for file_path in aqi_files:
        try:
            filename = os.path.basename(file_path)
            parts = filename.replace('.xlsx', '').split('_')
            city = parts[4]
            year = parts[5]
            
            # Read the Excel file
            df = pd.read_excel(file_path)
            
            # Handle different column names
            day_column = 'Date' if 'Date' in df.columns else 'Day'
            
            # Check data type of day column to determine if it's numeric
            is_numeric_day = pd.api.types.is_numeric_dtype(df[day_column])
            
            # Get month columns (they're fixed for all files)
            month_columns = ['January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December']
            available_months = [col for col in month_columns if col in df.columns]
            
            # Melt the dataframe to convert from wide to long format
            df_melted = df.melt(id_vars=[day_column], 
                               value_vars=available_months,
                               var_name='Month', 
                               value_name='AQI')
            
            # Create month number mapping
            month_to_num = {month: idx+1 for idx, month in enumerate(month_columns)}
            df_melted['Month_Num'] = df_melted['Month'].map(month_to_num)
            
            # Add city and year
            df_melted['City'] = city.title()
            df_melted['Year'] = int(year)
            
            # Convert AQI to numeric and drop NaN
            df_melted['AQI'] = pd.to_numeric(df_melted['AQI'], errors='coerce')
            df_melted = df_melted.dropna(subset=['AQI'])
            
            # If day column has summary rows (e.g. "Good", "Satisfactory"), drop them
            df_melted[day_column] = pd.to_numeric(df_melted[day_column], errors='coerce')
            df_melted = df_melted.dropna(subset=[day_column])
            
            # Rename day column to 'Day'
            df_melted = df_melted.rename(columns={day_column: 'Day'})
            
            # Create date column (Year, Month, Day)
            # Convert Day column to integer explicitly
            df_melted['Day'] = pd.to_numeric(df_melted['Day'], errors='coerce')
            
            # Create a date using a dictionary approach which is safer
            df_melted['Date'] = pd.to_datetime({
                'year': df_melted['Year'],
                'month': df_melted['Month_Num'],
                'day': df_melted['Day']
            }, errors='coerce')
            
            # Drop rows with invalid dates
            df_melted = df_melted.dropna(subset=['Date', 'Day'])
            
            aqi_data_list.append(df_melted)
            
        except Exception as e:
            st.error(f'Error processing {filename}: {str(e)}')
    
    if aqi_data_list:
        combined = pd.concat(aqi_data_list, ignore_index=True)
        return combined
    else:
        st.error('No AQI data could be loaded')
        return pd.DataFrame()

@st.cache_data(ttl=3600)
def calculate_aqi_metrics(df):
    """Calculate key metrics from the AQI data"""
    metrics = {}
    
    # Overall metrics
    metrics['overall_avg'] = df['AQI'].mean()
    metrics['overall_max'] = df['AQI'].max()
    metrics['overall_min'] = df['AQI'].min()
    
    # City-level metrics
    city_metrics = df.groupby('City').agg({
        'AQI': ['mean', 'max', 'min', 'count']
    })
    city_metrics.columns = ['avg_aqi', 'max_aqi', 'min_aqi', 'readings']
    city_metrics = city_metrics.reset_index()
    metrics['city_metrics'] = city_metrics
    
    # Yearly trends
    yearly_metrics = df.groupby(['Year']).agg({
        'AQI': ['mean', 'max', 'min', 'count']
    })
    yearly_metrics.columns = ['avg_aqi', 'max_aqi', 'min_aqi', 'readings']
    yearly_metrics = yearly_metrics.reset_index()
    metrics['yearly_metrics'] = yearly_metrics
    
    # Monthly patterns across years
    monthly_metrics = df.groupby(['Month']).agg({
        'AQI': ['mean', 'max', 'min', 'count']
    })
    monthly_metrics.columns = ['avg_aqi', 'max_aqi', 'min_aqi', 'readings']
    monthly_metrics = monthly_metrics.reset_index()
    
    # Sort by the order of months
    month_order = {'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
                  'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12}
    monthly_metrics['month_num'] = monthly_metrics['Month'].map(month_order)
    monthly_metrics = monthly_metrics.sort_values('month_num')
    monthly_metrics = monthly_metrics.drop('month_num', axis=1)
    metrics['monthly_metrics'] = monthly_metrics
    
    return metrics

@st.cache_data
def categorize_aqi(aqi_value):
    """Categorize AQI values based on standard ranges"""
    if pd.isna(aqi_value):
        return "Unknown"
    elif aqi_value <= 50:
        return "Good (0-50)"
    elif aqi_value <= 100:
        return "Satisfactory (51-100)"
    elif aqi_value <= 200:
        return "Moderate (101-200)"
    elif aqi_value <= 300:
        return "Poor (201-300)"
    elif aqi_value <= 400:
        return "Very Poor (301-400)"
    else:
        return "Severe (401+)"

@st.cache_data
def get_aqi_color(category):
    """Get color for AQI category based on India's standards"""
    colors = {
        "Good (0-50)": "#1a9641",
        "Satisfactory (51-100)": "#a6d96a",
        "Moderate (101-200)": "#ffffbf",
        "Poor (201-300)": "#fdae61",
        "Very Poor (301-400)": "#d7191c",
        "Severe (401+)": "#7a0000",
        "Unknown": "#636363"
    }
    return colors.get(category, "#636363")

@st.cache_data
def get_aqi_colorscale():
    """Get a continuous color scale for AQI values"""
    return [
        [0, '#1a9641'],
        [0.1, '#a6d96a'],
        [0.2, '#ffffbf'],
        [0.4, '#fdae61'],
        [0.6, '#d7191c'],
        [1.0, '#7a0000']
    ]

@st.cache_data(ttl=3600)
def load_ghg_emissions_data():
    """Load and process GHG emissions data"""
    data_path = os.path.dirname(os.path.abspath(__file__))
    ghg_data_list = []
    
    ghg_dir = os.path.join(data_path, 'ghgemission')
    if not os.path.exists(ghg_dir) or not os.path.isdir(ghg_dir):
        return pd.DataFrame()
    
    country_folders = [d for d in os.listdir(ghg_dir) if os.path.isdir(os.path.join(ghg_dir, d)) and len(d) == 3]
    if not country_folders:
        return pd.DataFrame()
    
    for country_code in country_folders:
        country_path = os.path.join(ghg_dir, country_code)
        sector_base_path = country_path
        if 'DATA' in os.listdir(country_path) and os.path.isdir(os.path.join(country_path, 'DATA')):
            sector_base_path = os.path.join(country_path, 'DATA')
            
        sector_folders = [d for d in os.listdir(sector_base_path) if os.path.isdir(os.path.join(sector_base_path, d))]
        
        for sector in sector_folders:
            sector_path = os.path.join(sector_base_path, sector)
            country_emissions_files = glob.glob(os.path.join(sector_path, "*_country_emissions_*.csv"))
            
            for file_path in country_emissions_files:
                try:
                    filename = os.path.basename(file_path)
                    subsector = filename.split('_')[0]
                    
                    df = pd.read_csv(file_path)
                    if 'start_time' in df.columns:
                        df['Year'] = pd.to_datetime(df['start_time']).dt.year
                    if 'sector' not in df.columns:
                        df['sector'] = sector
                    if 'subsector' not in df.columns:
                        df['subsector'] = subsector
                    if 'iso3_country' in df.columns:
                        def iso3_to_country(iso3):
                            try:
                                return pycountry.countries.get(alpha_3=iso3).name
                            except:
                                return iso3
                        df['Country'] = df['iso3_country'].apply(iso3_to_country)
                    
                    if 'emissions_quantity' in df.columns:
                        df = df.rename(columns={'emissions_quantity': 'emissions'})
                    df['sector_simplified'] = df['sector'].apply(lambda x: x.replace('_', ' ').title())
                    ghg_data_list.append(df)
                except Exception:
                    pass
    
    if ghg_data_list:
        combined = pd.concat(ghg_data_list, ignore_index=True)
        return combined
    else:
        return pd.DataFrame()

@st.cache_data(ttl=3600)
def calculate_ghg_metrics(df):
    """Calculate key metrics from the GHG emissions data"""
    metrics = {}
    metrics['overall_total'] = df['emissions'].sum()
    
    sector_metrics = df.groupby('sector').agg({'emissions': 'sum'}).reset_index()
    sector_metrics = sector_metrics.sort_values('emissions', ascending=False)
    metrics['sector_metrics'] = sector_metrics
    
    if 'Country' in df.columns:
        country_metrics = df.groupby('Country').agg({'emissions': 'sum'}).reset_index()
        country_metrics = country_metrics.sort_values('emissions', ascending=False)
        metrics['country_metrics'] = country_metrics
    
    if 'Year' in df.columns:
        yearly_metrics = df.groupby('Year').agg({'emissions': 'sum'}).reset_index()
        metrics['yearly_metrics'] = yearly_metrics
        
        sector_year_metrics = df.groupby(['sector', 'Year']).agg({'emissions': 'sum'}).reset_index()
        metrics['sector_year_metrics'] = sector_year_metrics
    
    return metrics

def get_country_coordinates():
    return {
        'India': {'lat': 20.5937, 'lon': 78.9629},
        'China': {'lat': 35.8617, 'lon': 104.1954},
        'United States': {'lat': 37.0902, 'lon': -95.7129},
        'Russia': {'lat': 61.5240, 'lon': 105.3188},
        'Brazil': {'lat': -14.2350, 'lon': -51.9253},
        'Japan': {'lat': 36.2048, 'lon': 138.2529},
        'Germany': {'lat': 51.1657, 'lon': 10.4515},
        'Canada': {'lat': 56.1304, 'lon': -106.3468},
        'France': {'lat': 46.2276, 'lon': 2.2137},
        'United Kingdom': {'lat': 55.3781, 'lon': -3.4360},
        'Italy': {'lat': 41.8719, 'lon': 12.5675},
        'Australia': {'lat': -25.2744, 'lon': 133.7751},
        'South Korea': {'lat': 35.9078, 'lon': 127.7669},
        'Indonesia': {'lat': -0.7893, 'lon': 113.9213},
        'Turkey': {'lat': 38.9637, 'lon': 35.2433},
        'Mexico': {'lat': 23.6345, 'lon': -102.5528},
        'Saudi Arabia': {'lat': 23.8859, 'lon': 45.0792},
        'South Africa': {'lat': -30.5595, 'lon': 22.9375},
        'Nigeria': {'lat': 9.0820, 'lon': 8.6753},
        'Pakistan': {'lat': 30.3753, 'lon': 69.3451},
        'Bangladesh': {'lat': 23.6850, 'lon': 90.3563},
        'Vietnam': {'lat': 14.0583, 'lon': 108.2772}
    }

@st.cache_data(ttl=3600)
def load_land_data():
    """Load SDG 15 Land data"""
    data_path = os.path.dirname(os.path.abspath(__file__))
    land_dir = os.path.join(data_path, 'land')
    
    datasets = {}
    try:
        datasets['deforestation'] = pd.read_csv(os.path.join(land_dir, 'Deforestation_alerts_(RADD).csv'))
    except:
        datasets['deforestation'] = pd.DataFrame()
        
    try:
        datasets['soil'] = pd.read_csv(os.path.join(land_dir, 'dailysoilhealth.csv'))
    except:
        datasets['soil'] = pd.DataFrame()
        
    try:
        datasets['dumping'] = pd.read_csv(os.path.join(land_dir, 'india_open_dumping_sites_dummy_extended.csv'))
    except:
        datasets['dumping'] = pd.DataFrame()
        
    return datasets

@st.cache_data(ttl=3600)
def load_marine_data():
    """Load Marine data for SDG 14"""
    data_path = os.path.dirname(os.path.abspath(__file__))
    marine_dir = os.path.join(data_path, 'MarineData')
    marine_data = {}
    
    try:
        import netCDF4 as nc
        from cftime import num2date
        
        so_file = os.path.join(marine_dir, 'cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m_1765555392031.nc')
        thetao_file = os.path.join(marine_dir, 'cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m_1765555358411.nc')
        
        if os.path.exists(so_file) and os.path.exists(thetao_file):
            ds_so = nc.Dataset(so_file)
            ds_thetao = nc.Dataset(thetao_file)
            
            lat = ds_so.variables['latitude'][:]
            lon = ds_so.variables['longitude'][:]
            time_data = ds_so.variables['time'][:]
            
            # Extract time
            calendar = ds_so.variables['time'].calendar if hasattr(ds_so.variables['time'], 'calendar') else 'standard'
            time_dates = num2date(time_data, units=ds_so.variables['time'].units, calendar=calendar)
            time_dates = [pd.to_datetime(str(d)) for d in time_dates]
            
            import numpy as np
            so_mean = np.ma.mean(ds_so.variables['so'][:], axis=(1, 2, 3))
            thetao_mean = np.ma.mean(ds_thetao.variables['thetao'][:], axis=(1, 2, 3))
            
            marine_data['timeseries'] = pd.DataFrame({
                'Date': time_dates,
                'Salinity (psu)': so_mean.filled(np.nan) if hasattr(so_mean, 'filled') else so_mean,
                'Temperature (°C)': thetao_mean.filled(np.nan) if hasattr(thetao_mean, 'filled') else thetao_mean
            })
            
            # Data for mapping (Latest snapshot)
            lons, lats = np.meshgrid(lon, lat)
            so_slice = ds_so.variables['so'][-1, 0, :, :]
            thetao_slice = ds_thetao.variables['thetao'][-1, 0, :, :]
            
            map_df = pd.DataFrame({
                'Lat': lats.flatten(),
                'Lon': lons.flatten(),
                'Salinity': so_slice.flatten(),
                'Temperature': thetao_slice.flatten()
            })
            
            # Fill masked array values and clean invalid values
            for col in ['Salinity', 'Temperature']:
                if hasattr(map_df[col].values, 'filled'):
                   # fill standard fill_values with nan
                   map_df[col] = map_df[col].values.filled(np.nan) 
                   
            map_df = map_df.dropna()
            
            marine_data['map_data'] = map_df
            marine_data['lat_bounds'] = (float(np.min(lat)), float(np.max(lat)))
            marine_data['lon_bounds'] = (float(np.min(lon)), float(np.max(lon)))
            
    except Exception as e:
        print(f"Error loading marine data: {e}")
        st.error(f"Error loading marine data: {e}")
        
    return marine_data

