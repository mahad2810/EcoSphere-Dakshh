# 🌍 Climate Action & Ecosystems Dashboard

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge.svg)](https://climate-action-ecosystems.streamlit.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![SDG 13](https://img.shields.io/badge/SDG-13_Climate_Action-blue.svg)](https://sdgs.un.org/goals/goal13)
[![SDG 14](https://img.shields.io/badge/SDG-14_Life_Below_Water-cyan.svg)](https://sdgs.un.org/goals/goal14)
[![SDG 15](https://img.shields.io/badge/SDG-15_Life_on_Land-green.svg)](https://sdgs.un.org/goals/goal15)

A comprehensive, interactive data visualization platform built with **Streamlit** to monitor and analyze environmental metrics across **SDG 13 (Climate Action)**, **SDG 14 (Life Below Water)**, and **SDG 15 (Life on Land)**. This dashboard provides real-time insights into air quality, greenhouse gas emissions, marine ecosystems, and land preservation efforts through high-fidelity data visualization and live API integrations.

---

## 🚀 Key Features

### 📊 SDG 13: Climate Action & Air Quality
- **Air Quality Trends**: Historical analysis of AQI (Air Quality Index) across major Indian cities (Bengaluru, Chennai, Delhi, Hyderabad, Kolkata, Mumbai) from 2019 to 2025.
- **Live Air Quality Search**: Real-time AQI lookup for any city globally using the **Open-Meteo Air Quality API**, including PM2.5, PM10, NO2, CO, and O3 levels.
- **GHG Emissions Monitoring**: Global tracking of greenhouse gas emissions by sector (Agriculture, Manufacturing, Power, Transportation, etc.) and country, powered by **WRI Climate Watch (CAIT)** data.
- **Detailed Statistical Breakdown**: In-depth analysis of environmental pollutants and emission patterns over time.

### 🐠 SDG 14: Life Below Water
- **Ocean Physics Metrics**: Analysis of sea surface temperature and salinity levels using **NEMO-based Ocean Physics Analysis**.
- **Marine Ecosystem Health**: Spatiotemporal visualization of marine data using **NetCDF4** datasets to monitor ocean warming and acidification patterns.
- **Live Ocean Data**: Integration with the **Open-Meteo Marine API** for broader oceanic temperature monitoring beyond the local dataset subset.

### 🌳 SDG 15: Life on Land
- **Deforestation Alerts**: Real-time monitoring and historical trends in forest cover loss using **RADD (Radar for Detecting Deforestation)** alerts.
- **Soil Health Tracking**: Daily monitoring of soil health metrics, including moisture levels (7-28cm depth) via **ERA5-Land** reanalysis data.
- **Waste Management Mapping**: Geospatial mapping of open dumping sites across India to monitor and mitigate land pollution risks.

---

## 🛠️ Technical Implementation

### 🛡️ Data Provenance & Verification
Transparency is a core principle of this project. The dashboard includes a **Data Provenance Registry** that provides proof of data for every metric:
- **Air Quality**: Sourced from **Copernicus Atmosphere Monitoring Service (CAMS)** via Open-Meteo.
- **Soil Moisture**: Reanalysis from **ERA5-Land (ECMWF)** archive.
- **Sea Temperature**: Physical analysis from **Copernicus Marine Service (CMEMS)**.
- **GHG Emissions**: Historical records from **World Resources Institute (WRI)**.

### 📈 Scientific Methodology
- **Satellite-Model Fusion**: Air quality metrics are derived from near real-time satellite observations fused with atmospheric models.
- **NEMO Model**: Ocean physics data is processed from the **Nucleus for European Modelling of the Ocean (NEMO)** reanalysis.
- **WGS84 Projections**: Geospatial data is projected using standard WGS84 centroids for accurate mapping.

### ⚙️ Feature Highlights
- **PDF/CSV Export**: Built-in functionality to export current analysis figures and datasets for offline reporting.
- **Caching Mechanism**: Uses `st.cache_data` and `st.cache_resource` for optimized performance and reduced API calls.
- **Modular Tab Architecture**: Each SDG goal is isolated into its own module within the `tabs/` directory for scalability.

---

## 🛠️ Tech Stack

- **Framework**: [Streamlit](https://streamlit.io/)
- **Data Manipulation**: [Pandas](https://pandas.pydata.org/), [NumPy](https://numpy.org/)
- **Visualization**: [Plotly](https://plotly.com/python/), [Matplotlib](https://matplotlib.org/)
- **Scientific Data**: [NetCDF4](https://unidata.github.io/netcdf4-python/) (for ocean metrics)
- **Geospatial**: [Pycountry](https://pypi.org/project/pycountry/), Geocoding API
- **Data Formats**: Excel (.xlsx), CSV (.csv), NetCDF (.nc), JSON (.json)

---

## 📁 Project Structure

```text
climateaction/
├── app.py              # Main Streamlit application entry point
├── data_processing.py  # Core data processing and caching logic
├── live_apis.py        # Integration with external environmental APIs
├── export_utils.py     # Utilities for report and data export
├── tabs/               # Modular UI components for each feature
│   ├── air_quality.py
│   ├── city_comparison.py
│   ├── ghg_emissions.py
│   ├── detailed_analysis.py
│   ├── land_ecosystem.py
│   └── marine_ecosystem.py
├── AQIData/            # Historical AQI Excel records (2019-2025)
├── ghgemission/        # Global GHG emission records (Climate Watch)
├── land/               # SDG 15 datasets (Deforestation, Soil, Waste)
└── MarineData/         # High-resolution NetCDF files for ocean metrics
```

---

## ⚙️ Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/climateaction.git
   cd climateaction
   ```

2. **Create a Virtual Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```
   *Note: Ensure you have `netCDF4` and `pycountry` installed for full functionality.*

4. **Run the Application**
   ```bash
   streamlit run app.py
   ```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Developed with ❤️ for a Sustainable Future.**
