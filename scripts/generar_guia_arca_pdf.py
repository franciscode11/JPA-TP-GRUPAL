from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "GUIA_HOMOLOGACION_ARCA.md"
OUTPUT = ROOT / "output" / "pdf" / "Guia_Homologacion_ARCA.pdf"


def inline_markup(text: str) -> str:
    safe = escape(text)
    safe = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', safe)
    safe = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", safe)
    safe = re.sub(
        r"(https?://[^\s<]+)",
        r'<link href="\1" color="#1f4f78">\1</link>',
        safe,
    )
    return safe


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=28,
            textColor=colors.HexColor("#171717"),
            spaceAfter=12,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=19,
            textColor=colors.HexColor("#171717"),
            spaceBefore=15,
            spaceAfter=7,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=colors.HexColor("#303030"),
            spaceAfter=7,
        ),
        "list": ParagraphStyle(
            "List",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.3,
            leading=13.5,
            textColor=colors.HexColor("#303030"),
        ),
        "code": ParagraphStyle(
            "Code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=7.5,
            leading=10.5,
            leftIndent=8,
            rightIndent=8,
            borderColor=colors.HexColor("#d7d7d2"),
            borderWidth=.6,
            borderPadding=8,
            backColor=colors.HexColor("#f4f4f1"),
            spaceBefore=3,
            spaceAfter=9,
        ),
        "cover": ParagraphStyle(
            "Cover",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#666663"),
        ),
    }


def parse_markdown(text: str, style_map) -> list:
    story = []
    lines = text.splitlines()
    index = 0
    first_title = True
    while index < len(lines):
        line = lines[index].rstrip()
        if line.startswith("```"):
            code_lines = []
            index += 1
            while index < len(lines) and not lines[index].startswith("```"):
                code_lines.append(lines[index])
                index += 1
            story.append(Preformatted("\n".join(code_lines), style_map["code"]))
        elif line.startswith("# "):
            if first_title:
                story.extend([
                    Spacer(1, 44 * mm),
                    Paragraph(inline_markup(line[2:]), style_map["title"]),
                    Spacer(1, 5 * mm),
                    Paragraph(
                        "Procedimiento seguro para el trabajo práctico. Ambiente de prueba, sin validez fiscal.",
                        style_map["cover"],
                    ),
                    Spacer(1, 70 * mm),
                    Paragraph("Sistema de facturación", style_map["cover"]),
                    PageBreak(),
                ])
                first_title = False
            else:
                story.append(Paragraph(inline_markup(line[2:]), style_map["title"]))
        elif line.startswith("## "):
            story.append(Paragraph(inline_markup(line[3:]), style_map["h2"]))
        elif re.match(r"^\d+\. ", line):
            items = []
            while index < len(lines) and re.match(r"^\d+\. ", lines[index]):
                content = re.sub(r"^\d+\. ", "", lines[index])
                items.append(ListItem(Paragraph(inline_markup(content), style_map["list"])))
                index += 1
            story.append(ListFlowable(items, bulletType="1", leftIndent=18, bulletFontSize=8))
            story.append(Spacer(1, 5))
            index -= 1
        elif line.startswith("- "):
            items = []
            while index < len(lines) and lines[index].startswith("- "):
                items.append(ListItem(Paragraph(inline_markup(lines[index][2:]), style_map["list"])))
                index += 1
            story.append(ListFlowable(items, bulletType="bullet", leftIndent=18, bulletFontSize=7))
            story.append(Spacer(1, 5))
            index -= 1
        elif line.strip():
            paragraph = [line.strip()]
            while index + 1 < len(lines):
                candidate = lines[index + 1].strip()
                if not candidate or candidate.startswith(("#", "- ", "```")) or re.match(r"^\d+\. ", candidate):
                    break
                index += 1
                paragraph.append(candidate)
            story.append(Paragraph(inline_markup(" ".join(paragraph)), style_map["body"]))
        index += 1
    return story


def decorate_page(canvas, document):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(colors.HexColor("#d8d8d3"))
    canvas.setLineWidth(.5)
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#70706b"))
    canvas.drawString(18 * mm, 10 * mm, "Guía de homologación ARCA")
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Página {document.page}")
    canvas.restoreState()


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=22 * mm,
        title="Guía de homologación ARCA para el TP",
        author="Equipo Factura ARCA",
        subject="Alta, certificados y emisión WSAA/WSFEv1 en homologación",
    )
    story = parse_markdown(SOURCE.read_text(encoding="utf-8"), styles())
    document.build(story, onFirstPage=decorate_page, onLaterPages=decorate_page)
    print(OUTPUT)


if __name__ == "__main__":
    main()
