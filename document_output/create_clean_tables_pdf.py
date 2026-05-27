from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Spacer, Table, TableStyle, Paragraph


OUT = Path("/Users/shivachoudhry/Downloads/Ai-VendorHub/document_output/HRM204_Final_Corrected_Tables.pdf")


def style_table(table, header_rows=0, font_size=16, leading=18):
    commands = [
        ("GRID", (0, 0), (-1, -1), 1.2, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (0, 0), (-1, -1), "Times-Roman"),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
        ("LEADING", (0, 0), (-1, -1), leading),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]
    if header_rows:
        commands.extend([
            ("FONTNAME", (0, 0), (-1, header_rows - 1), "Times-Bold"),
            ("ALIGN", (0, 0), (-1, header_rows - 1), "CENTER"),
        ])
    table.setStyle(TableStyle(commands))
    return table


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=landscape(A4),
        rightMargin=0.45 * inch,
        leftMargin=0.45 * inch,
        topMargin=0.45 * inch,
        bottomMargin=0.45 * inch,
    )

    styles = getSampleStyleSheet()
    heading = styles["Heading2"]
    heading.fontName = "Times-Bold"
    heading.fontSize = 18
    heading.leading = 22
    heading.spaceAfter = 8

    metadata = [
        ["Name of the faculty\nmember:", "Dr. Ulfat Andrabi", "Course Code:", "HRM204"],
        ["Academic Task No:", "2", "Course Title:", "Compensation\nManagement"],
        ["Date of Allotment:", "25/04/2026", "Date of Submission:", "10/05/2026"],
        ["Student Roll No:", "12310596", "Student Reg. No:", "_______________"],
        ["Term:", "325262", "Section:", "_______________"],
        ["Max. Marks:", "30", "Marks Obtained:", ""],
    ]
    metadata_table = Table(
        metadata,
        colWidths=[2.35 * inch, 2.35 * inch, 2.35 * inch, 2.35 * inch],
        rowHeights=[0.68 * inch, 0.68 * inch, 0.58 * inch, 0.58 * inch, 0.58 * inch, 0.58 * inch],
    )
    style_table(metadata_table, font_size=18, leading=20)
    metadata_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Times-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Times-Bold"),
    ]))

    peer = [
        ["Sr. No", "Registration No.", "Name of the Student", "Roll No.", "Peer Rating"],
        ["1", "12310596", "Shiva Choudhry", "56", "10/10"],
        ["2", "12309087", "Ashish Raj", "35", "9.3/10"],
        ["3", "12308406", "Hansraj", "26", "8.2/10"],
        ["4", "12308110", "Abhishek kumar", "22", "8.3/10"],
        ["5", "", "", "", ""],
    ]
    peer_table = Table(
        peer,
        colWidths=[0.9 * inch, 1.95 * inch, 2.55 * inch, 1.1 * inch, 1.5 * inch],
        rowHeights=[0.42 * inch, 0.44 * inch, 0.44 * inch, 0.44 * inch, 0.44 * inch, 0.44 * inch],
    )
    style_table(peer_table, header_rows=1, font_size=15, leading=17)
    peer_table.setStyle(TableStyle([
        ("ALIGN", (0, 1), (-1, -1), "CENTER"),
    ]))

    story = [
        metadata_table,
        Spacer(1, 0.45 * inch),
        Paragraph("Peer Rating Table", heading),
        peer_table,
    ]
    doc.build(story)
    print(OUT)


if __name__ == "__main__":
    main()
