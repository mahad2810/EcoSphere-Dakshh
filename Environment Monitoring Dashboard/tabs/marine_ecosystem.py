import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from export_utils import export_analysis
from live_apis import fetch_sea_temperature, get_data_source_info


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


def render_marine_ecosystem_tab(marine_data):

    st.markdown("<div class='sub-header'>Life Below Water (SDG 14)</div>", unsafe_allow_html=True)

    figures_to_export = []

    if not marine_data:
        st.warning("Marine data could not be loaded. Please ensure NetCDF files are placed in the correct directory.")
        return

    timeseries_df = marine_data.get('timeseries', pd.DataFrame())
    map_df = marine_data.get('map_data', pd.DataFrame())

    st.markdown("### 🌊 Ocean Physical Parameters Overview")

    kpi_cols = st.columns(3)

    with st.spinner("Fetching live marine data endpoints..."):
        live_marine_df = fetch_sea_temperature()
    
    # --- Data Proof Section ---
    marine_source = get_data_source_info("Sea Temperature")
    with st.expander("🔍 Data Authenticity & Verification Details"):
        st.info(f"""
        **Primary Source:** {marine_source['Provider']}  
        **Methodology:** {marine_source['Method']}  
        **Official Resource:** [Link to Documentation]({marine_source['Link']})  
        **Verification Tip:** You can cross-check this live data with the Copernicus Marine Global Analysis data portal.
        """)
        
        if 'Date' in timeseries_df.columns and not timeseries_df.empty:
            date_min = pd.to_datetime(timeseries_df['Date'], errors='coerce').min()
            date_max = pd.to_datetime(timeseries_df['Date'], errors='coerce').max()
            if pd.notnull(date_min) and pd.notnull(date_max):
                st.markdown(f"**Data Range Available:** {date_min.strftime('%Y-%m-%d')} to {date_max.strftime('%Y-%m-%d')}")
        
        if not live_marine_df.empty:
            st.write("### Raw Satellite API Output (Sample)")
            st.dataframe(live_marine_df.head(10), use_container_width=True)
    

    with kpi_cols[0]:
        st.markdown("<div class='metric-card'><div class='metric-icon'>🌡️</div><div class='metric-content'>", unsafe_allow_html=True)

        if not live_marine_df.empty:
            avg_temp = live_marine_df['Temperature (°C)'].mean()
            st.metric("Avg Global Sea Temp (Live)", f"{avg_temp:.2f} °C")

        elif not timeseries_df.empty:
            avg_temp = timeseries_df['Temperature (°C)'].mean()
            st.metric("Avg Global Sea Temp", f"{avg_temp:.2f} °C")

        else:
            st.metric("Avg Global Sea Temp", "N/A")

        st.markdown("</div></div>", unsafe_allow_html=True)

    with kpi_cols[1]:

        st.markdown("<div class='metric-card'><div class='metric-icon'>🧂</div><div class='metric-content'>", unsafe_allow_html=True)

        if not timeseries_df.empty:
            avg_salinity = timeseries_df['Salinity (psu)'].mean()
            st.metric("Avg Global Salinity", f"{avg_salinity:.2f} psu")
        else:
            st.metric("Avg Global Salinity", "N/A")

        st.markdown("</div></div>", unsafe_allow_html=True)

    with kpi_cols[2]:

        st.markdown("<div class='metric-card'><div class='metric-icon'>📅</div><div class='metric-content'>", unsafe_allow_html=True)

        if not timeseries_df.empty:
            days_tracked = len(timeseries_df)
            st.metric("Days Tracked", f"{days_tracked} Days")
        else:
            st.metric("Days Tracked", "N/A")

        st.markdown("</div></div>", unsafe_allow_html=True)

    st.markdown("<hr>", unsafe_allow_html=True)
    st.markdown("### 📈 Time Series Analysis")

    col1, col2 = st.columns(2)

    with col1:

        merged_temp_df = pd.DataFrame()

        if not live_marine_df.empty:

            merged_temp_df = live_marine_df.copy()

            if not timeseries_df.empty:
                hist_data = timeseries_df[timeseries_df['Date'] < merged_temp_df['Date'].min()].copy()
                merged_temp_df = pd.concat([hist_data, merged_temp_df]).sort_values('Date')

        else:
            merged_temp_df = timeseries_df

        if not merged_temp_df.empty:

            fig_temp = px.line(
                merged_temp_df,
                x='Date',
                y='Temperature (°C)',
                title="Global Average Sea Water Temperature Trend (Historical + Live)",
                color_discrete_sequence=['#ff6b6b']
            )

            fig_temp.update_traces(mode='lines+markers')
            fig_temp = apply_dark_theme_to_fig(fig_temp)

            st.plotly_chart(fig_temp, use_container_width=True)
            st.caption("Description: Highlights broad trends and anomalies in the ocean's surface temperature by bridging historical readings with up-to-the-minute live satellite data.")
            figures_to_export.append(fig_temp)

        else:
            st.info("No temperature data available.")

    with col2:

        if not timeseries_df.empty:

            fig_salinity = px.line(
                timeseries_df,
                x='Date',
                y='Salinity (psu)',
                title="Global Average Sea Water Salinity Trend",
                color_discrete_sequence=['#1a8099']
            )

            fig_salinity.update_traces(mode='lines+markers')
            fig_salinity = apply_dark_theme_to_fig(fig_salinity)

            st.plotly_chart(fig_salinity, use_container_width=True)
            st.caption("Description: Tracks ongoing changes in global sea surface salinity, which is crucial for monitoring fresh water runoff, ice melt, and ocean current disruptions.")
            figures_to_export.append(fig_salinity)

    st.markdown("<hr>", unsafe_allow_html=True)
    st.markdown("### 🗺️ Recent Parameter Distribution Map")

    if not map_df.empty:

        parameter = st.selectbox(
            "Select Parameter to Display on Map",
            ["Temperature", "Salinity"]
        )

        color_scale = "Thermal" if parameter == "Temperature" else "Blues"

        # Sample points for performance
        plot_df = map_df.sample(min(15000, len(map_df)))

        # -------- Auto center using real data --------
        center_lat = plot_df['Lat'].mean()
        center_lon = plot_df['Lon'].mean()

        # -------- Auto zoom depending on area --------
        lat_range = plot_df['Lat'].max() - plot_df['Lat'].min()

        if lat_range > 120:
            zoom = 1
        elif lat_range > 60:
            zoom = 2
        elif lat_range > 30:
            zoom = 3
        elif lat_range > 15:
            zoom = 4
        else:
            zoom = 5

        fig_map = px.scatter_mapbox(
            plot_df,
            lat='Lat',
            lon='Lon',
            color=parameter,
            color_continuous_scale=color_scale,
            mapbox_style="carto-darkmatter",
            zoom=zoom,
            center={"lat": center_lat, "lon": center_lon},
            title=f"Ocean {parameter} Distribution"
        )
        # Add Data Source Attribution
        fig_map.add_annotation(
            text=f"Source: {marine_source['Provider']} | Method: {marine_source['Method']}",
            xref="paper", yref="paper", x=1, y=-0.05, showarrow=False, font=dict(size=10, color="lightgray")
        )

        fig_map.update_traces(marker=dict(size=8, opacity=0.8))

        fig_map.update_layout(
            height=700,
            margin=dict(l=0, r=0, t=30, b=0)
        )

        fig_map = apply_dark_theme_to_fig(fig_map)

        st.plotly_chart(fig_map, use_container_width=True)
        st.caption("Description: A spatial plot offering a visual representation of oceanic physical parameters relative to real-world coordinates and geographic features.")
        figures_to_export.append(fig_map)

    else:
        st.info("No spatial mapping data available to plot.")

    st.markdown("<hr>", unsafe_allow_html=True)

    export_analysis(
        figures_to_export,
        timeseries_df,
        "Life Below Water",
        "Ocean physical parameters over valid time periods."
    )