import io
from django.template.loader import render_to_string
from xhtml2pdf import pisa
from security.pdf_hashing import compute_sha256

def generate_invoice_pdf(invoice):
    """
    Renders invoice HTML with xhtml2pdf and returns (pdf_bytes, sha256_hash).
    """
    context = {
        'invoice': invoice,
    }
    html_content = render_to_string('invoice_template.html', context)
    
    buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(src=html_content, dest=buffer, encoding='utf-8')
    
    if pisa_status.err:
        raise RuntimeError(f"Error generating PDF invoice: {pisa_status.err}")
        
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    pdf_hash = compute_sha256(pdf_bytes)
    return pdf_bytes, pdf_hash

