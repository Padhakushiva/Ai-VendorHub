from pathlib import Path
from tempfile import NamedTemporaryFile

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter


BASE_PDF = Path("/Users/shivachoudhry/Downloads/HRM204_Starbucks_Assignment_CA2_Updated.pdf")
FINAL_PDF = Path("/Users/shivachoudhry/Downloads/Ai-VendorHub/document_output/HRM204_Starbucks_Assignment_CA2_Final.pdf")


def build_overlay(path: Path):
    c = canvas.Canvas(str(path), pagesize=letter)
    c.setFillColorRGB(1, 1, 1)

    # Cover old values in the first metadata table.
    covers = [
        (172, 391, 70, 18),    # Academic Task No value
        (172, 349, 98, 18),    # Date of Allotment value
        (406, 349, 105, 18),   # Date of Submission value
    ]
    for x, y, w, h in covers:
        c.rect(x, y, w, h, fill=1, stroke=0)

    c.setFillColorRGB(0, 0, 0)
    c.setFont("Times-Roman", 11.04)
    c.drawString(177.3, 396.6, "2")
    c.drawString(177.3, 354.6, "25/04/2026")
    c.drawString(411.3, 354.6, "10/05/2026")
    c.save()


def main():
    FINAL_PDF.parent.mkdir(parents=True, exist_ok=True)

    reader = PdfReader(str(BASE_PDF))
    writer = PdfWriter()

    with NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        overlay_path = Path(tmp.name)

    build_overlay(overlay_path)
    overlay_page = PdfReader(str(overlay_path)).pages[0]

    for index, page in enumerate(reader.pages):
        if index == 0:
            page.merge_page(overlay_page)
        writer.add_page(page)

    with FINAL_PDF.open("wb") as output:
        writer.write(output)

    overlay_path.unlink(missing_ok=True)
    print(FINAL_PDF)


if __name__ == "__main__":
    main()
