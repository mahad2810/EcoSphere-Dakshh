import io
import plotly.graph_objects as go
from fpdf import FPDF
import streamlit as st

def generate_pdf_bytes(figures, str_data, title, text):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    
    pdf.cell(0, 10, txt=title, ln=True, align='C')
    pdf.ln(10)
    
    if text:
        pdf.set_font("Arial", size=11)
        # Using encoding replacements to handle tricky characters if needed
        safe_text = str(text).encode('latin-1', 'replace').decode('latin-1')
        pdf.multi_cell(0, 6, txt=safe_text)
        pdf.ln(5)
    
    if str_data:
        pdf.set_font("Courier", size=8)
        safe_data = str(str_data).encode('latin-1', 'replace').decode('latin-1')
        pdf.multi_cell(0, 4, txt=safe_data[:4000])
        pdf.ln(5)
        
    pdf.set_font("Arial", 'B', 12)
    if figures:
        pdf.cell(0, 10, txt="Graphical Analysis", ln=True)
        pdf.ln(5)
        
        for fig in figures:
            if fig is not None:
                try:
                    # Update layout specifically for PDF rendering (white background)
                    import copy
                    fig_pdf = go.Figure(fig)
                    fig_pdf.update_layout(paper_bgcolor="white", plot_bgcolor="white", font=dict(color="black"))
                    
                    buf = io.BytesIO()
                    fig_pdf.write_image(buf, format="png", width=800, height=450, scale=2, engine="kaleido")
                    buf.seek(0)
                    
                    if pdf.get_y() > 200:
                        pdf.add_page()
                        
                    pdf.image(buf, x=10, w=190)
                    pdf.ln(95)
                    
                except Exception as e:
                    pdf.set_font("Arial", 'I', 10)
                    pdf.cell(0, 10, txt=f"Could not render figure: {str(e)}", ln=True)
                    pdf.ln(5)
            
    # Output to bytes instead of bytearray for streamit
    output = pdf.output()
    if isinstance(output, bytearray):
        return bytes(output)
    return bytes(output)

def export_analysis(figures, dataframe, title, analysis_text=""):
    """
    Reusable component to show a download button for a PDF report.
    Returns nothing.
    """
    with st.expander(f"📥 Export {title} Report"):
        st.write("Generate a comprehensive PDF report containing all charts and data summaries from this section.")
        
        pdf_state_key = f"pdf_bytes_{title}"
        
        # We need a button to trigger generation, and another to download.
        # Once generated, we store it in session state so download button appears.
        col1, col2 = st.columns([1, 3])
        
        with col1:
            if st.button(f"Generate '{title}' PDF", key=f"btn_gen_{title}"):
                with st.spinner("Generating PDF Report with charts..."):
                    try:
                        df_str = dataframe.head(20).to_string() if dataframe is not None and not dataframe.empty else ""
                        b = generate_pdf_bytes(figures, df_str, title, analysis_text)
                        st.session_state[pdf_state_key] = b
                    except Exception as e:
                        st.error(f"Error generating PDF: {str(e)}")
                        
        with col2:
            if pdf_state_key in st.session_state:
                st.download_button(
                    label="⬇️ Download PDF",
                    data=st.session_state[pdf_state_key],
                    file_name=f"{title.replace(' ', '_').lower()}_report.pdf",
                    mime="application/pdf",
                    key=f"btn_dl_{title}"
                )
