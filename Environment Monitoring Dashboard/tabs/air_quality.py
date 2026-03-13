import streamlit as st
import plotly.express as px
import datetime
from data_processing import categorize_aqi, get_aqi_color
from export_utils import export_analysis
from live_apis import fetch_air_quality, fetch_city_coords, get_data_source_info

def render_air_quality_tab(aqi_data, aqi_metrics):
    st.markdown("<div class='sub-header'>Air Quality Trends</div>", unsafe_allow_html=True)
    figures_to_export = []
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown("<div class='metric-container'>", unsafe_allow_html=True)
        st.metric("Average AQI", f"{aqi_metrics['overall_avg']:.1f}")
        st.markdown("<div class='info-text'>Overall average air quality index</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
    with col2:
        st.markdown("<div class='metric-container'>", unsafe_allow_html=True)
        st.metric("Maximum AQI", f"{aqi_metrics['overall_max']:.1f}")
        st.markdown("<div class='info-text'>Highest recorded AQI value</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
    with col3:
        st.markdown("<div class='metric-container'>", unsafe_allow_html=True)
        st.metric("Minimum AQI", f"{aqi_metrics['overall_min']:.1f}")
        st.markdown("<div class='info-text'>Lowest recorded AQI value</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
    with col4:
        st.markdown("<div class='metric-container'>", unsafe_allow_html=True)
        good_days_pct = (aqi_data['AQI_Category'] == 'Good (0-50)').mean() * 100
        st.metric("Good Air Quality Days", f"{good_days_pct:.1f}%")
        st.markdown("<div class='info-text'>Percentage of days with good air quality</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
    
    st.sidebar.markdown("### 🌐 Live Air Quality Search")
    live_city = st.sidebar.text_input("Get current AQI for any city:", key="aqi_search_main")
    if live_city:
        l_lat, l_lon = fetch_city_coords(live_city)
        if l_lat and l_lon:
            l_data = fetch_air_quality(l_lat, l_lon)
            if l_data:
                # Get the current time from system
                api_time = datetime.datetime.now().strftime("%I:%M %p")
                st.sidebar.success(f"Current AQI in {live_city}: {l_data.get('european_aqi')}")
                st.sidebar.caption(f"🕒 Last updated: {api_time} via Open-Meteo Satellite")
                st.sidebar.info(f"PM2.5: {l_data.get('pm2_5')} | NO2: {l_data.get('nitrogen_dioxide')}")
            else:
                st.sidebar.error("Failed to fetch live data.")
        else:
            st.sidebar.error("City not found.")
    
    # --- Data Proof ---
    aqi_source = get_data_source_info("Air Quality")
    with st.expander("🛡️ Data Provenance & Verification (Proof of Data)"):
        col_p1, col_p2 = st.columns(2)
        with col_p1:
            st.markdown(f"**Primary Provider:** {aqi_source['Provider']}")
            st.markdown(f"**Collection Method:** {aqi_source['Method']}")
        with col_p2:
            st.markdown(f"**Dataset Reference:** [Documentation]({aqi_source['Link']})")
            st.markdown(f"**Scientific License:** {aqi_source['License']}")
        
        if 'Date' in aqi_data.columns and not aqi_data.empty:
            date_min = aqi_data['Date'].min().strftime('%Y-%m-%d')
            date_max = aqi_data['Date'].max().strftime('%Y-%m-%d')
            st.markdown(f"**Data Range Available:** {date_min} to {date_max}")
            
        st.caption("Verification Tip: This dashboard pulls directly from the Copernicus Atmosphere Monitoring Service (CAMS) via the Open-Meteo API gateway. Coordinates used are real-world WGS84 centroids.")
    
    
    st.markdown("### Yearly Air Quality Trends")
    yearly_data = aqi_metrics['yearly_metrics']
    fig = px.line(yearly_data, x='Year', y='avg_aqi', title='Average Air Quality Index by Year',
                  labels={'avg_aqi': 'Average AQI', 'Year': 'Year'})
    fig.add_scatter(x=yearly_data['Year'], y=yearly_data['max_aqi'], mode='lines+markers', name='Maximum AQI', line=dict(color='red', dash='dash'))
    fig.add_scatter(x=yearly_data['Year'], y=yearly_data['min_aqi'], mode='lines+markers', name='Minimum AQI', line=dict(color='green', dash='dash'))
    fig.update_layout(height=500)
    fig.update_layout(height=500)
    st.plotly_chart(fig, use_container_width=True)
    st.caption("Description: This graph illustrates the trend of Air Quality averages, maximums, and minimums over the available years, providing a high-level view of long-term air quality shifts.")
    figures_to_export.append(fig)
    
    st.markdown("### Monthly Air Quality Patterns")
    monthly_data = aqi_metrics['monthly_metrics']
    fig = px.bar(monthly_data, x='Month', y='avg_aqi', title='Average AQI by Month',
                 labels={'avg_aqi': 'Average AQI', 'Month': 'Month'}, color='avg_aqi',
                 color_continuous_scale=px.colors.sequential.Plasma)
    fig.update_layout(height=500)
    fig.update_layout(height=500)
    st.plotly_chart(fig, use_container_width=True)
    st.caption("Description: This bar chart displays the average AQI for each month, helping to identify seasonal patterns and peak pollution periods within a standard year.")
    figures_to_export.append(fig)
    
    st.markdown("### AQI Categories and Ranges")
    st.markdown("""
    The Air Quality Index (AQI) is categorized based on the following ranges (according to India's National Ambient Air Quality Standards):
    
    | Category | AQI Range | Color |
    |----------|-----------|-------|
    | Good (0-50) | 0-50 | <span style='color:#1a9641'>■</span> |
    | Satisfactory (51-100) | 51-100 | <span style='color:#a6d96a'>■</span> |
    | Moderate (101-200) | 101-200 | <span style='color:#ffffbf'>■</span> |
    | Poor (201-300) | 201-300 | <span style='color:#fdae61'>■</span> |
    | Very Poor (301-400) | 301-400 | <span style='color:#d7191c'>■</span> |
    | Severe (401+) | 401+ | <span style='color:#7a0000'>■</span> |
    """, unsafe_allow_html=True)
    
    st.markdown("### AQI Distribution")
    fig = px.histogram(aqi_data, x='AQI', title='Distribution of AQI Values', color='AQI_Category',
                       color_discrete_map={cat: get_aqi_color(cat) for cat in aqi_data['AQI_Category'].unique()})
    fig.update_layout(height=500)
    fig.update_layout(height=500)
    st.plotly_chart(fig, use_container_width=True)
    st.caption("Description: This histogram maps out the frequency of various AQI value ranges, showing how prevalent different levels of air pollution are in the dataset.")
    figures_to_export.append(fig)
    
    st.markdown("### AQI Categories Breakdown")
    category_counts = aqi_data['AQI_Category'].value_counts().reset_index()
    category_counts.columns = ['Category', 'Count']
    fig = px.pie(category_counts, values='Count', names='Category', title='Distribution of AQI Categories', color='Category',
                 color_discrete_map={cat: get_aqi_color(cat) for cat in category_counts['Category']})
    fig.update_layout(height=500)
    fig.update_layout(height=500)
    st.plotly_chart(fig, use_container_width=True)
    st.caption("Description: A comparative pie chart breakdown of air quality categories, making it easy to see the proportion of time spent in 'Good' versus 'Poor' or 'Severe' conditions.")
    figures_to_export.append(fig)
    
    st.markdown("<hr>", unsafe_allow_html=True)
    export_analysis(figures_to_export, aqi_data, "Air Quality Trends", "Analysis of air quality trends and classifications.")
