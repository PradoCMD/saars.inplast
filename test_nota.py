import pdfplumber
import sys

def test_pdf(path):
    with pdfplumber.open(path) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    
    print(f"--- TEXTO EXTRAIDO: {path} ---")
    print(text[:1000]) # View first 1000 characters to understand differences
    print("...")

test_pdf("/Volumes/logistica/Automação Romaneio Logistica x PCP/ROMANEIO 553 NOTA.pdf")
