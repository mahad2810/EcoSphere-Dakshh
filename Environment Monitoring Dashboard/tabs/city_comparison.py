import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from data_processing import get_aqi_colorscale, get_aqi_color
from export_utils import export_analysis
from live_apis import fetch_air_quality, fetch_city_coords


def render_city_comparison_tab(aqi_data, aqi_metrics):

    st.markdown("<div class='sub-header'>City Comparison</div>", unsafe_allow_html=True)

    figures_to_export = []

    city_coords = {
        'Delhi': {'lat': 28.7041, 'lon': 77.1025},
        'Mumbai': {'lat': 19.0760, 'lon': 72.8777},
        'Kolkata': {'lat': 22.5726, 'lon': 88.3639},
        'Chennai': {'lat': 13.0827, 'lon': 80.2707},
        'Bengaluru': {'lat': 12.9716, 'lon': 77.5946},
        'Hyderabad': {'lat': 17.3850, 'lon': 78.4867},
        'Ahmedabad': {'lat': 23.0225, 'lon': 72.5714},
        'Pune': {'lat': 18.5204, 'lon': 73.8567},
        'Surat': {'lat': 21.1702, 'lon': 72.8311},
        'Lucknow': {'lat': 26.8467, 'lon': 80.9462}
    }

    # -----------------------------
    # Prepare Map Data
    # -----------------------------
    city_aqi_data = aqi_metrics['city_metrics'].copy()

    map_data = []
    for _, row in city_aqi_data.iterrows():

        city = row['City']

        if city in city_coords:

            map_data.append({
                'City': city,
                'lat': city_coords[city]['lat'],
                'lon': city_coords[city]['lon'],
                'avg_aqi': row['avg_aqi'],
                'max_aqi': row['max_aqi']
            })

    if map_data:

        map_df = pd.DataFrame(map_data)

        st.markdown("### Air Quality Map")

        fig = go.Figure()

        # -----------------------------
        # Heatmap Layer
        # -----------------------------
        density_fig = px.density_mapbox(
            map_df,
            lat='lat',
            lon='lon',
            z='avg_aqi',
            radius=50,
            color_continuous_scale=get_aqi_colorscale(),
            mapbox_style="carto-darkmatter",
            zoom=4,
            center={"lat": 20.5937, "lon": 78.9629}
        )

        density_trace = density_fig.data[0]

        # hide heatmap legend
        density_trace.showscale = False

        fig.add_trace(density_trace)

        # -----------------------------
        # City Marker Layer
        # -----------------------------
        fig.add_trace(
            go.Scattermapbox(
                lat=map_df['lat'],
                lon=map_df['lon'],
                mode='markers',

                marker=dict(
                    size=16,
                    color=map_df['avg_aqi'],
                    colorscale=get_aqi_colorscale(),
                    showscale=True,
                    opacity=0.85,

                    colorbar=dict(
                        title="AQI",
                        tickvals=[25, 75, 150, 250, 350, 450],
                        ticktext=[
                            "Good (0-50)",
                            "Satisfactory (51-100)",
                            "Moderate (101-200)",
                            "Poor (201-300)",
                            "Very Poor (301-400)",
                            "Severe (401+)"
                        ]
                    )
                ),

                text=[
                    f"{city}<br>Average AQI: {avg:.1f}<br>Max AQI: {max_aqi:.1f}"
                    for city, avg, max_aqi in zip(
                        map_df['City'],
                        map_df['avg_aqi'],
                        map_df['max_aqi']
                    )
                ],

                hovertemplate="<b>%{text}</b><extra></extra>"
            )
        )

        # remove coloraxis legend created by density_mapbox
        fig.update_layout(coloraxis_showscale=False)

        fig.update_layout(
            title="Air Quality Index Heatmap by City",
            mapbox=dict(
                style="carto-darkmatter",
                zoom=4,
                center={"lat": 20.5937, "lon": 78.9629}
            ),
            height=600,
            margin={"r": 0, "t": 50, "l": 0, "b": 0}
        )

        st.plotly_chart(fig, use_container_width=True)
        st.caption("Description: A comparative density map showing average air quality across key cities, allowing geographic visualization of pollution hotspots.")
        figures_to_export.append(fig)

    # -----------------------------
    # City Comparison Charts
    # -----------------------------
    col1, col2 = st.columns(2)

    with col1:

        city_avg = aqi_metrics['city_metrics'].sort_values('avg_aqi', ascending=True)

        fig = px.bar(
            city_avg,
            x='City',
            y='avg_aqi',
            title='Average AQI by City',
            labels={'avg_aqi': 'Average AQI'},
            color='avg_aqi',
            color_continuous_scale=px.colors.sequential.Plasma
        )

        fig.update_layout(height=500)

        st.plotly_chart(fig, use_container_width=True)
        st.caption("Description: Ranks cities by their overall mean AQI, providing a straightforward baseline comparison of general air quality.")
        figures_to_export.append(fig)

    with col2:

        city_max = aqi_metrics['city_metrics'].sort_values('max_aqi', ascending=False)

        fig = px.bar(
            city_max,
            x='City',
            y='max_aqi',
            title='Maximum AQI by City',
            labels={'max_aqi': 'Maximum AQI'},
            color='max_aqi',
            color_continuous_scale=px.colors.sequential.Plasma_r
        )

        fig.update_layout(height=500)

        st.plotly_chart(fig, use_container_width=True)
        st.caption("Description: Highlights the worst recorded AQI extremes per city, which is critical for identifying locations prone to severe, temporary pollution spikes.")
        figures_to_export.append(fig)

    # -----------------------------
    # AQI Trend Comparison
    # -----------------------------
    st.markdown("### AQI Trends by City")

    available_cities = sorted(aqi_data['City'].unique())

    selected_cities = st.multiselect(
        "Select cities to compare:",
        available_cities,
        default=available_cities[:3] if len(available_cities) >= 3 else available_cities
    )

    if selected_cities:

        city_data = aqi_data[aqi_data['City'].isin(selected_cities)]

        city_monthly = city_data.groupby(
            ['City', 'Year', 'Month_Num']
        ).agg({'AQI': 'mean'}).reset_index()

        city_monthly['YearMonth'] = pd.to_datetime(
            city_monthly['Year'].astype(str)
            + "-"
            + city_monthly['Month_Num'].astype(str).str.zfill(2)
            + "-01"
        )

        fig = px.line(
            city_monthly,
            x='YearMonth',
            y='AQI',
            color='City',
            title='Monthly Average AQI by City'
        )

        fig.update_layout(height=600)

        st.plotly_chart(fig, use_container_width=True)
        st.caption("Description: A time-series chart enabling direct comparison of multiple cities' monthly air quality trends to pinpoint shared seasonal pollution events.")
        figures_to_export.append(fig)

    else:

        st.warning("Please select at least one city.")

    # -----------------------------
    # Export Button
    # -----------------------------
    st.markdown("<hr>", unsafe_allow_html=True)

    export_analysis(
        figures_to_export,
        aqi_data,
        "City Comparison",
        "Air quality comparison across major cities."
    )