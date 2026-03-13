import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import plotly.figure_factory as ff
from export_utils import export_analysis
from export_utils import export_analysis
from live_apis import fetch_soil_moisture, get_data_source_info

def apply_dark_theme_to_fig(fig):
    """Apply dark theme to a Plotly figure to match main app"""
    dark_layout = {
        'plot_bgcolor': '#1e2329',
        'paper_bgcolor': 'rgba(0,0,0,0)',
        'font': {'family': 'Arial, sans-serif'},
        'xaxis': {
            'gridcolor': '#e0e0e0',
            'linecolor': '#e0e0e0',
        },
        'yaxis': {
            'gridcolor': '#e0e0e0',
            'linecolor': '#e0e0e0', 
        }
    }
    fig.update_layout(dark_layout)
    return fig

def render_land_ecosystem_tab(land_data):
    st.markdown("<div class='sub-header'>Life on Land (SDG 15)</div>", unsafe_allow_html=True)
    figures_to_export = []
    
    deforestation_data = land_data.get('deforestation', pd.DataFrame())
    soil_data = land_data.get('soil', pd.DataFrame())
    dumping_data = land_data.get('dumping', pd.DataFrame())
    
    # Live API Overrides
    with st.spinner("Fetching live environmental data..."):
        api_soil = fetch_soil_moisture()
        if api_soil is not None and not api_soil.empty:
            soil_data = api_soil
    
    # --- Data Proof Section ---
    soil_source = get_data_source_info("Soil Moisture")
    with st.expander("🔬 Terrestrial Data Integrity & Verification"):
        st.write(f"**Primary Source:** {soil_source['Provider']}")
        st.write(f"**Methodology:** {soil_source['Method']}")
        st.write(f"**Scientific Reference:** [{soil_source['Link']}]({soil_source['Link']})")
        
        if 'Date' in soil_data.columns and not soil_data.empty:
            date_min = pd.to_datetime(soil_data['Date'], errors='coerce').min()
            date_max = pd.to_datetime(soil_data['Date'], errors='coerce').max()
            if pd.notnull(date_min) and pd.notnull(date_max):
                st.write(f"**Data Range Available (Soil):** {date_min.strftime('%Y-%m-%d')} to {date_max.strftime('%Y-%m-%d')}")
        
        if not soil_data.empty:
            st.write("### Verified Soil Sensor Stream (Raw Sample)")
            st.dataframe(soil_data.head(5), use_container_width=True)
    
    
    # We will use sub-tabs to avoid clustering the single tab
    subtab1, subtab2, subtab3 = st.tabs([
        "📊 Land Overview", 
        "🌳 Forestry & Soil Health",
        "🔥 Environmental Risk"
    ])
    
    with subtab1:
        st.markdown("### 🌍 Ecosystem Health Indicators")
        
        kpi_cols = st.columns(4)
        with kpi_cols[0]:
            st.markdown("<div class='metric-card'><div class='metric-icon'>🌳</div><div class='metric-content'>", unsafe_allow_html=True)
            st.metric("Active Deforestation Alerts", len(deforestation_data) if not deforestation_data.empty else "N/A")
            st.markdown("</div></div>", unsafe_allow_html=True)
            
        with kpi_cols[1]:
            st.markdown("<div class='metric-card'><div class='metric-icon'>🚨</div><div class='metric-content'>", unsafe_allow_html=True)
            if not dumping_data.empty and 'overall_risk_score_0to5' in dumping_data.columns:
                avg_risk = dumping_data['overall_risk_score_0to5'].mean()
                st.metric("Avg Dumping Risk Level", f"{avg_risk:.1f}/5")
            else:
                st.metric("Avg Dumping Risk Level", "N/A")
            st.markdown("</div></div>", unsafe_allow_html=True)
            
        with kpi_cols[2]:
            st.markdown("<div class='metric-card'><div class='metric-icon'>🏞️</div><div class='metric-content'>", unsafe_allow_html=True)
            if not dumping_data.empty and 'area_hectares' in dumping_data.columns:
                total_area = dumping_data['area_hectares'].sum()
                st.metric("Affected Area", f"{total_area:,.0f} ha")
            else:
                st.metric("Affected Area", "N/A")
            st.markdown("</div></div>", unsafe_allow_html=True)
            
        with kpi_cols[3]:
            st.markdown("<div class='metric-card'><div class='metric-icon'>🌱</div><div class='metric-content'>", unsafe_allow_html=True)
            st.metric("Soil Daily Readings", len(soil_data) if not soil_data.empty else "N/A")
            st.markdown("</div></div>", unsafe_allow_html=True)

        if not dumping_data.empty and 'latitude' in dumping_data.columns and 'longitude' in dumping_data.columns:
            st.markdown("### 🗺️ Environmental Risk Distribution")
            fig = px.scatter_mapbox(
                dumping_data.head(500),  # Limit for performance
                lat='latitude',
                lon='longitude',
                color='overall_risk_score_0to5' if 'overall_risk_score_0to5' in dumping_data.columns else None,
                size='area_hectares' if 'area_hectares' in dumping_data.columns else None,
                hover_data=['site_name', 'state'] if all(col in dumping_data.columns for col in ['site_name', 'state']) else None,
                mapbox_style="carto-darkmatter",
                zoom=4,
                height=500,
                color_continuous_scale="RdYlGn_r"
            )
            center_lat = dumping_data['latitude'].mean()
            center_lon = dumping_data['longitude'].mean()
            fig.update_layout(mapbox=dict(center=dict(lat=center_lat, lon=center_lon)), margin=dict(l=0, r=0, t=30, b=0))
            fig = apply_dark_theme_to_fig(fig)
            st.plotly_chart(fig, use_container_width=True)
            st.caption("Description: A map plotting reported environmental risks and illegal dumping sites. Larger points signify greater affected areas, while colors denote risk severity.")
            figures_to_export.append(fig)
            
    with subtab2:
        st.markdown("### 🌳 Deforestation Analytics")
        if not deforestation_data.empty:
            col1, col2 = st.columns(2)
            with col1:
                total_alerts = len(deforestation_data)
                total_area = deforestation_data['Shape__Area'].sum() if 'Shape__Area' in deforestation_data.columns else 0
                st.metric("Total Alerts", total_alerts)
                st.metric("Total Affected Area", f"{total_area:,.2f}")
            with col2:
                if 'Shape__Area' in deforestation_data.columns:
                    fig = px.histogram(
                        deforestation_data, 
                        x='Shape__Area', 
                        nbins=30,
                        title="Deforestation Severity (Area Affected per Alert)",
                        labels={'Shape__Area': 'Affected Area (sq units)'},
                        color_discrete_sequence=['#1a9641']
                    )
                    fig = apply_dark_theme_to_fig(fig)
                    st.plotly_chart(fig, use_container_width=True)
                    st.caption("Description: A histogram classifying deforestation alerts by the magnitude of the affected area, indicating the relative frequency of large vs. small clearance events.")
                    figures_to_export.append(fig)

            if 'latitude' in deforestation_data.columns and 'longitude' in deforestation_data.columns:
                st.markdown("#### Deforestation Hotspots")
                coords = deforestation_data[['latitude', 'longitude']].dropna()
                if len(coords) > 0:
                    fig = px.scatter_mapbox(
                        coords.head(1000),
                        lat='latitude',
                        lon='longitude',
                        mapbox_style="carto-darkmatter",
                        zoom=2,
                        color_discrete_sequence=['#ff6b6b'],
                        height=500
                    )
                    fig.update_layout(margin=dict(l=0, r=0, t=30, b=0))
                    fig = apply_dark_theme_to_fig(fig)
                    st.plotly_chart(fig, use_container_width=True)
                    st.caption("Description: A spatial heatmap pin-pointing locations experiencing active deforestation alerts, illustrating regions with rapid forest cover loss.")
                    figures_to_export.append(fig)
        else:
            st.warning("No deforestation data available.")

        st.markdown("<hr>", unsafe_allow_html=True)
        st.markdown("### 🌱 Live Soil Health Analysis")
        if not soil_data.empty and 'Date' in soil_data.columns and 'Avg_smlvl_at15cm' in soil_data.columns:
            st.markdown("#### Average Soil Moisture Level Trend (Real-time)")
            soil_df = soil_data.copy()
            soil_df['Date'] = pd.to_datetime(soil_df['Date'], errors='coerce')
            soil_trend = soil_df.groupby('Date', as_index=False)['Avg_smlvl_at15cm'].mean().dropna().sort_values('Date')
            
            fig = px.line(
                soil_trend,
                x='Date',
                y='Avg_smlvl_at15cm',
                title="Soil Moisture Trend (15cm Depth)",
                labels={'Avg_smlvl_at15cm': 'Avg Soil Moisture Level', 'Date': 'Date'},
                color_discrete_sequence=['#1a9641']
            )
            fig.update_traces(mode='lines+markers')
            fig = apply_dark_theme_to_fig(fig)
            st.plotly_chart(fig, use_container_width=True)
            st.caption("Description: A time-series graph demonstrating daily shifts in average soil moisture, vital for understanding regional drought risks or agricultural conditions.")
            figures_to_export.append(fig)
        else:
            st.warning("No historical soil moisture data available.")
            
    with subtab3:
        st.markdown("### 🔥 Environmental Risk Analysis")
        if not dumping_data.empty:
            if 'overall_risk_score_0to5' in dumping_data.columns:
                col1, col2 = st.columns(2)
                with col1:
                    fig = px.histogram(
                        dumping_data,
                        x='overall_risk_score_0to5',
                        nbins=20,
                        title="Risk Score Distribution",
                        color_discrete_sequence=['#d7191c']
                    )
                    fig = apply_dark_theme_to_fig(fig)
                    st.plotly_chart(fig, use_container_width=True)
                    st.caption("Description: Highlights the volume of environmentally hazardous sites categorized by their calculated risk scores, from low to critical.")
                    figures_to_export.append(fig)
                    
                with col2:
                    if 'state' in dumping_data.columns:
                        state_risk = dumping_data.groupby('state')['overall_risk_score_0to5'].agg(['mean']).round(2)
                        state_risk = state_risk.sort_values('mean', ascending=False).head(10)
                        
                        fig = px.bar(
                            x=state_risk.index,
                            y=state_risk['mean'],
                            title="Top 10 States by Average Risk",
                            color=state_risk['mean'],
                            color_continuous_scale='RdYlGn_r'
                        )
                        fig.update_layout(xaxis_tickangle=-45)
                        fig = apply_dark_theme_to_fig(fig)
                        st.plotly_chart(fig, use_container_width=True)
                        st.caption("Description: A bar chart ranking the top states or regions based on the average environmental risk score associated with local dumping sites.")
                        figures_to_export.append(fig)
        else:
            st.warning("No environmental risk data available.")

    st.markdown("<hr>", unsafe_allow_html=True)
    export_analysis(figures_to_export, soil_data, "Life on Land", "Ecosystem health indicators and terrestrial trends analysis.")
