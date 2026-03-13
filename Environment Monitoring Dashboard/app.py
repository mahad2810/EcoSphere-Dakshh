import streamlit as st
import os

from data_processing import load_aqi_data, calculate_aqi_metrics, load_ghg_emissions_data, calculate_ghg_metrics, categorize_aqi, get_aqi_color, load_land_data, load_marine_data
from tabs.air_quality import render_air_quality_tab
from tabs.city_comparison import render_city_comparison_tab
from tabs.ghg_emissions import render_ghg_emissions_tab
from tabs.detailed_analysis import render_detailed_analysis_tab
from tabs.land_ecosystem import render_land_ecosystem_tab
from tabs.marine_ecosystem import render_marine_ecosystem_tab

st.set_page_config(
    page_title="Climate Action & Ecosystems - SDG 13, 14 & 15",
    page_icon="🌍",
    layout="wide"
)

st.markdown("""
<style>
    .main-header { font-size: 2.5rem; font-weight: bold; color: #29b5d8; text-align: center; margin-bottom: 1rem; }
    .sub-header { font-size: 1.8rem; font-weight: bold; color: #1a8099; }
    .metric-container { background-color: rgba(128,128,128,0.1); border-radius: 5px; padding: 10px; box-shadow: 2px 2px 5px rgba(0,0,0,0.1); }
    .metric-card { background-color: rgba(128,128,128,0.05); border-radius: 10px; padding: 10px; margin-bottom: 10px; display: flex; align-items: center; border-left: 4px solid #1a8099; }
    .metric-icon { font-size: 2rem; margin-right: 10px; background-color: rgba(128,128,128,0.1); padding: 10px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .metric-content { flex-grow: 1; color: inherit; }
    .info-text { font-size: 0.9rem; color: inherit; opacity: 0.7; }
</style>
""", unsafe_allow_html=True)

st.markdown("<div class='main-header'>Climate & Ecosystems Dashboard (SDG 13, 14 & 15)</div>", unsafe_allow_html=True)
st.markdown("This dashboard provides insights on air quality, greenhouse gas emissions, marine life, and land ecosystem risks. Visualizations only.")

def main():
    with st.spinner("Loading AQI data..."):
        aqi_data = load_aqi_data()
        
    if aqi_data.empty:
        st.error("Failed to load AQI data. Please check the data files.")
        return
    
    aqi_data['AQI_Category'] = aqi_data['AQI'].apply(categorize_aqi)
    aqi_data['AQI_Color'] = aqi_data['AQI_Category'].apply(get_aqi_color)
    aqi_metrics = calculate_aqi_metrics(aqi_data)
    
    with st.spinner("Loading GHG emissions data..."):
        try:
            ghg_data = load_ghg_emissions_data()
            if not ghg_data.empty:
                ghg_metrics = calculate_ghg_metrics(ghg_data)
                has_ghg_data = True
            else:
                ghg_metrics = {}
                has_ghg_data = False
        except Exception as e:
            st.error(f"Error loading GHG data: {str(e)}")
            ghg_metrics = {}
            has_ghg_data = False

    with st.spinner("Loading Land & Ecosystem data..."):
        land_data = load_land_data()

    with st.spinner("Loading Marine Ecosystem data..."):
        marine_data = load_marine_data()

    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "📊 Air Quality Trends", 
        "🏙️ City Comparison", 
        "🌡️ GHG Emissions", 
        "🔬 Detailed Analysis",
        "🌳 Life on Land (SDG 15)",
        "🐠 Life Below Water (SDG 14)"
    ])
    
    with tab1:
        render_air_quality_tab(aqi_data, aqi_metrics)
        
    with tab2:
        render_city_comparison_tab(aqi_data, aqi_metrics)
        
    with tab3:
        render_ghg_emissions_tab(ghg_data, ghg_metrics, has_ghg_data)
        
    with tab4:
        render_detailed_analysis_tab(aqi_data)

    with tab5:
        render_land_ecosystem_tab(land_data)

    with tab6:
        render_marine_ecosystem_tab(marine_data)

if __name__ == "__main__":
    main()
