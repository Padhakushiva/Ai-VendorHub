from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


BASE_PDF = Path("/Users/shivachoudhry/Downloads/HRM204_Starbucks_Assignment_CA2_Updated.pdf")
OUTPUT_PDF = Path("/Users/shivachoudhry/Downloads/Ai-VendorHub/document_output/HRM204_CA2_Final_Proper_Format.pdf")


def overlay_pdf_bytes():
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)

    # Keep the original PDF page intact and only cover the old values.
    c.setFillColorRGB(1, 1, 1)
    for x, y, w, h in [
        (171.5, 390.8, 72, 18),   # Academic Task No: old "1"
        (171.5, 348.8, 104, 18),  # Date of Allotment: old date
        (405.5, 348.8, 112, 18),  # Date of Submission: old date
    ]:
        c.rect(x, y, w, h, fill=1, stroke=0)

    c.setFillColorRGB(0, 0, 0)
    c.setFont("Times-Roman", 11.04)
    c.drawString(177.3, 396.6, "2")
    c.drawString(177.3, 354.6, "25/04/2026")
    c.drawString(411.3, 354.6, "10/05/2026")
    c.save()

    buffer.seek(0)
    return buffer.getvalue()


def main():
    reader = PdfReader(str(BASE_PDF))
    overlay_reader = PdfReader(BytesIO(overlay_pdf_bytes()))
    overlay_page = overlay_reader.pages[0]

    writer = PdfWriter()

    for page_number, page in enumerate(reader.pages):
        if page_number == 0:
            page.merge_page(overlay_page, over=True)
        writer.add_page(page)

    metadata = reader.metadata or {}
    writer.add_metadata({
        "/Title": "HRM204 CA2 Final Proper Format",
        "/Author": "Shiva Choudhry",
        "/Producer": "Codex direct PDF edit",
        **{k: str(v) for k, v in metadata.items() if k.startswith("/") and v is not None},
    })

    with OUTPUT_PDF.open("wb") as output:
        writer.write(output)

    # Verify the generated PDF can be parsed and has the expected pages.
    verify_reader = PdfReader(str(OUTPUT_PDF))
    if len(verify_reader.pages) != len(reader.pages):
        raise RuntimeError("PDF page count changed during export")

    print(OUTPUT_PDF)


if __name__ == "__main__":
    main()
