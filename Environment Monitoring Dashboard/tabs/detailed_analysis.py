import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from datetime import datetime
from data_processing import categorize_aqi, get_aqi_color, get_aqi_colorscale
from export_utils import export_analysis

def render_detailed_analysis_tab(aqi_data):
    st.markdown("<div class='sub-header'>Detailed Analysis</div>", unsafe_allow_html=True)
    figures_to_export = []
    
    st.markdown("### 3D Analysis of Air Quality Trends")
    aqi_3d = aqi_data.groupby(['City', 'Year', 'Month_Num']).agg({
        'AQI': 'mean',
        'AQI_Category': lambda x: x.mode().iloc[0] if not x.mode().empty else "Unknown"
    }).reset_index()
    
    month_names = {1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun', 
                  7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'}
    aqi_3d['Month'] = aqi_3d['Month_Num'].map(month_names)
    aqi_3d['Color'] = aqi_3d['AQI_Category'].apply(get_aqi_color)
    
    fig = go.Figure()
    for city in aqi_3d['City'].unique():
        city_data = aqi_3d[aqi_3d['City'] == city]
        fig.add_trace(go.Scatter3d(
            x=city_data['Year'], y=city_data['Month_Num'], z=city_data['AQI'],
            mode='markers', marker=dict(size=city_data['AQI']/5, color=city_data['Color'], opacity=0.8, line=dict(width=0.5, color='#ffffff')),
            text=[f"City: {city}<br>Month: {m}<br>Year: {y}<br>AQI: {aqi:.1f}<br>Category: {cat}" 
                  for m, y, aqi, cat in zip(city_data['Month'], city_data['Year'], city_data['AQI'], city_data['AQI_Category'])],
            hoverinfo='text', name=city
        ))
    
    fig.update_layout(
        title='3D Air Quality Visualization (City, Time, AQI)',
        scene=dict(
            xaxis_title='Year', yaxis_title='Month', zaxis_title='AQI',
            yaxis=dict(tickvals=list(range(1,13)), ticktext=list(month_names.values())),
            camera=dict(up=dict(x=0, y=0, z=1), eye=dict(x=-1.5, y=-1.5, z=1))
        ), height=700, margin=dict(l=0, r=0, b=0, t=50)
    )
    st.plotly_chart(fig, use_container_width=True)
    figures_to_export.append(fig)
    
    st.markdown("### Seasonal Air Quality Analysis")
    def get_season(month):
        if month in [12, 1, 2]: return 'Winter'
        elif month in [3, 4, 5]: return 'Spring'
        elif month in [6, 7, 8]: return 'Summer'
        else: return 'Autumn'
    
    aqi_data['Season'] = aqi_data['Month_Num'].apply(get_season)
    seasonal_data = aqi_data.groupby(['City', 'Season']).agg({'AQI': 'mean'}).reset_index()
    seasonal_pivot = seasonal_data.pivot(index='City', columns='Season', values='AQI')
    
    fig = px.imshow(seasonal_pivot, title='Seasonal Average AQI by City', labels=dict(x="Season", y="City", color="Average AQI"),
                   color_continuous_scale=get_aqi_colorscale(), text_auto='.1f')
    st.plotly_chart(fig, use_container_width=True)
    figures_to_export.append(fig)
    
    st.markdown("### 3D Visualization of Seasonal AQI Patterns")
    seasons_order = ['Winter', 'Spring', 'Summer', 'Autumn']
    
    available_pollutants = []
    for col in ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3']:
        if col in aqi_data.columns:
            available_pollutants.append(col)
            
    agg_dict = {'AQI': 'mean'}
    for p in available_pollutants: agg_dict[p] = 'mean'
    seasonal_data_3d = aqi_data.groupby(['City', 'Season', 'Year']).agg(agg_dict).reset_index()
    
    available_years = sorted(aqi_data['Year'].unique())
    selected_years = st.multiselect("Select Years:", options=available_years, default=available_years[-3:] if len(available_years) >= 3 else available_years)
    
    if selected_years:
        seasonal_data_3d_filtered = seasonal_data_3d[seasonal_data_3d['Year'].isin(selected_years)]
        min_aqi = seasonal_data_3d['AQI'].min()
        max_aqi = seasonal_data_3d['AQI'].max()
        seasonal_data_3d_filtered['size'] = 5 + ((seasonal_data_3d_filtered['AQI'] - min_aqi) / max(1, max_aqi - min_aqi)) * 15
        
        fig = go.Figure()
        for year in selected_years:
            year_data = seasonal_data_3d_filtered[seasonal_data_3d_filtered['Year'] == year]
            marker_colors = [get_aqi_color(categorize_aqi(aqi)) for aqi in year_data['AQI']]
            hover_text = [f"City: {c}<br>Season: {s}<br>Year: {year}<br>AQI: {aqi:.1f}<br>Category: {categorize_aqi(aqi)}"
                          for c, s, aqi in zip(year_data['City'], year_data['Season'], year_data['AQI'])]
            
            fig.add_trace(go.Scatter3d(
                x=year_data['Season'], y=year_data['City'], z=year_data['AQI'],
                mode='markers', marker=dict(size=year_data['size'], color=marker_colors, opacity=0.8, symbol='circle'),
                name=f'Year {year}', text=hover_text, hoverinfo='text', showlegend=True
            ))
            
        fig.update_layout(
            title=f"3D Seasonal AQI Analysis",
            scene=dict(
                xaxis=dict(categoryorder='array', categoryarray=seasons_order, title='Season'),
                yaxis=dict(title='City'), zaxis=dict(title='AQI')
            ), height=700, margin=dict(l=0, r=0, b=0, t=50)
        )
        st.plotly_chart(fig, use_container_width=True)
        figures_to_export.append(fig)

    st.markdown("### Temporal Heatmap Analysis")
    available_cities = sorted(aqi_data['City'].unique())
    selected_city = st.selectbox("Select a city for detailed temporal analysis:", available_cities)
    if selected_city:
        city_data = aqi_data[aqi_data['City'] == selected_city].copy()
        temporal_data = []
        for year in sorted(city_data['Year'].unique()):
            year_data = city_data[city_data['Year'] == year]
            for month in range(1, 13):
                month_data = year_data[year_data['Month_Num'] == month]
                for day in range(1, 32):
                    day_data = month_data[month_data['Day'] == day]
                    if not day_data.empty:
                        aqi_value = day_data['AQI'].mean()
                        temporal_data.append({'Year': year, 'Month': month, 'Day': day, 'AQI': aqi_value, 'Category': categorize_aqi(aqi_value)})
        
        if temporal_data:
            temporal_df = pd.DataFrame(temporal_data)
            year_options = sorted(temporal_df['Year'].unique(), reverse=True)
            selected_year = st.selectbox("Select year for calendar view:", year_options)
            year_data = temporal_df[temporal_df['Year'] == selected_year]
            calendar_pivot = year_data.pivot(index='Day', columns='Month', values='AQI')
            
            month_names_l = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            fig = px.imshow(calendar_pivot, labels=dict(x="Month", y="Day", color="AQI"),
                           x=[month_names_l[i] for i in calendar_pivot.columns], y=calendar_pivot.index,
                           color_continuous_scale=get_aqi_colorscale(), title=f"Daily AQI Levels for {selected_city} in {selected_year}")
            st.plotly_chart(fig, use_container_width=True)
            figures_to_export.append(fig)
            
            monthly_avg = year_data.groupby('Month').agg({'AQI': 'mean'}).reset_index()
            monthly_avg['Month_Name'] = monthly_avg['Month'].apply(lambda x: month_names_l[x])
            fig = px.line(monthly_avg, x='Month_Name', y='AQI', markers=True, title=f"Monthly Average AQI Trend for {selected_city} in {selected_year}", color_discrete_sequence=['#1f77b4'])
            fig.add_hrect(y0=0, y1=50, line_width=0, fillcolor="rgba(26, 150, 65, 0.2)")
            fig.add_hrect(y0=50, y1=100, line_width=0, fillcolor="rgba(166, 217, 106, 0.2)")
            fig.add_hrect(y0=100, y1=200, line_width=0, fillcolor="rgba(255, 255, 191, 0.2)")
            fig.add_hrect(y0=200, y1=300, line_width=0, fillcolor="rgba(253, 174, 97, 0.2)")
            fig.add_hrect(y0=300, y1=400, line_width=0, fillcolor="rgba(215, 25, 28, 0.2)")
            fig.add_hrect(y0=400, y1=500, line_width=0, fillcolor="rgba(122, 0, 0, 0.2)")
            fig.update_layout(height=400)
            st.plotly_chart(fig, use_container_width=True)
            figures_to_export.append(fig)

    st.markdown("### Year over Year Comparison")
    available_years = sorted(aqi_data['Year'].unique())
    if len(available_years) >= 2:
        col1, col2 = st.columns(2)
        with col1: year1 = st.selectbox("Select first year:", available_years[:-1], index=len(available_years)-2)
        with col2: year2 = st.selectbox("Select second year:", available_years[available_years.index(year1)+1:], index=0)
        
        year1_monthly = aqi_data[aqi_data['Year'] == year1].groupby('Month_Num').agg({'AQI': 'mean'}).reset_index()
        year2_monthly = aqi_data[aqi_data['Year'] == year2].groupby('Month_Num').agg({'AQI': 'mean'}).reset_index()
        comparison_df = pd.merge(year1_monthly, year2_monthly, on='Month_Num', suffixes=(f'_{year1}', f'_{year2}'))
        comparison_df['Month'] = comparison_df['Month_Num'].apply(lambda x: datetime(2000, x, 1).strftime('%b'))
        comparison_df['Difference'] = comparison_df[f'AQI_{year2}'] - comparison_df[f'AQI_{year1}']
        comparison_df['Percent_Change'] = (comparison_df['Difference'] / comparison_df[f'AQI_{year1}']) * 100
        
        fig = go.Figure()
        fig.add_trace(go.Bar(x=comparison_df['Month'], y=comparison_df[f'AQI_{year1}'], name=f'{year1} AQI', marker_color='blue'))
        fig.add_trace(go.Bar(x=comparison_df['Month'], y=comparison_df[f'AQI_{year2}'], name=f'{year2} AQI', marker_color='red'))
        fig.update_layout(title=f'Monthly AQI Comparison: {year1} vs {year2}', barmode='group', height=500)
        st.plotly_chart(fig, use_container_width=True)
        figures_to_export.append(fig)
        
        fig = px.bar(comparison_df, x='Month', y='Percent_Change', title=f'Percent Change in AQI from {year1} to {year2}', color='Percent_Change', color_continuous_scale=px.colors.diverging.RdBu_r)
        fig.update_layout(height=500)
        st.plotly_chart(fig, use_container_width=True)
        figures_to_export.append(fig)

    st.markdown("<hr>", unsafe_allow_html=True)
    export_analysis(figures_to_export, aqi_data, "Detailed Air Quality Analysis", "3D, seasonal, and temporal map representations of global air quality structures.")
