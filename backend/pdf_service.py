"""Premium invoice PDF generator — blue/white theme matching on-screen preview."""
import io
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    Image as RLImage,
)
from reportlab.lib.enums import TA_RIGHT

from db import UPLOAD_ASSETS
from models import Company, Invoice


BLUE_DARK = colors.HexColor("#1E3A8A")   # blue-900
BLUE = colors.HexColor("#1D4ED8")        # blue-700
BLUE_LIGHT = colors.HexColor("#DBEAFE")  # blue-100
BLUE_BG = colors.HexColor("#EFF6FF")     # blue-50
INK = colors.HexColor("#0F172A")         # slate-900
INK_MUTED = colors.HexColor("#475569")   # slate-600
INK_SOFT = colors.HexColor("#94A3B8")    # slate-400
LINE = colors.HexColor("#E2E8F0")        # slate-200


def _asset_image(asset, max_w_mm: float, max_h_mm: float) -> Optional[RLImage]:
    if not asset or asset.mime == "image/svg+xml":
        return None
    path = UPLOAD_ASSETS / asset.filename
    if not path.exists():
        return None
    try:
        img = RLImage(str(path))
        _ = img.imageWidth, img.imageHeight  # force decode; catches PIL errors
        ratio = min((max_w_mm * mm) / img.imageWidth, (max_h_mm * mm) / img.imageHeight)
        img.drawWidth = img.imageWidth * ratio
        img.drawHeight = img.imageHeight * ratio
        return img
    except Exception:
        return None


def _draw_page(canvas, doc):
    """Draw the blue header band on every page."""
    canvas.saveState()
    company: Company = doc.company
    inv: Invoice = doc.invoice

    page_w, page_h = A4
    band_h = 42 * mm

    # Blue gradient band (approximation with solid + subtle darker overlay)
    canvas.setFillColor(BLUE_DARK)
    canvas.rect(0, page_h - band_h, page_w, band_h, stroke=0, fill=1)
    # Subtle diagonal accent
    canvas.setFillColor(BLUE)
    canvas.setFillAlpha(0.55)
    canvas.rect(page_w * 0.55, page_h - band_h, page_w * 0.45, band_h, stroke=0, fill=1)
    canvas.setFillAlpha(1)

    # Left: logo (with white pill) or company name
    left_x = 15 * mm
    top_y = page_h - 15 * mm
    logo_img = _asset_image(company.logo, 40, 20)
    if logo_img:
        # White backing so any logo pops against blue
        canvas.setFillColor(colors.white)
        canvas.roundRect(left_x - 2 * mm, top_y - 22 * mm, 46 * mm, 24 * mm, 2 * mm, stroke=0, fill=1)
        logo_img.drawOn(canvas, left_x, top_y - 21 * mm)
    else:
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 22)
        canvas.drawString(left_x, top_y - 6 * mm, company.name or "SD ENTERPRISES")

    # Left below: company address lines
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(colors.white)
    canvas.drawString(left_x, top_y - 26 * mm, (company.name or "SD ENTERPRISES"))
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#DBEAFE"))
    y = top_y - 30 * mm
    for line in [
        company.address,
        ", ".join(x for x in [company.city, company.state, company.pincode] if x),
        " · ".join(x for x in [company.phone, company.email, company.website] if x),
    ]:
        if line:
            canvas.drawString(left_x, y, line[:110])
            y -= 3.6 * mm

    # Right: INVOICE title + number + dates
    right_x = page_w - 15 * mm
    is_gst = inv.gst_type in ("cgst_sgst", "igst")
    canvas.setFillColor(colors.HexColor("#BFDBFE"))
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawRightString(right_x, top_y - 3 * mm, ("TAX INVOICE" if is_gst else "INVOICE"))
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 22)
    short_no = inv.invoice_number.split("/")[-1]
    canvas.drawRightString(right_x, top_y - 12 * mm, f"#{short_no}")
    canvas.setFont("Courier", 8)
    canvas.setFillColor(colors.HexColor("#DBEAFE"))
    canvas.drawRightString(right_x, top_y - 16 * mm, inv.invoice_number)
    canvas.setFont("Helvetica", 8.5)
    canvas.setFillColor(colors.white)
    canvas.drawRightString(right_x, top_y - 22 * mm, f"Date: {inv.invoice_date}")
    if inv.due_date:
        canvas.drawRightString(right_x, top_y - 26 * mm, f"Due: {inv.due_date}")
    # GST label chip
    label_txt = {"none": "Non-GST", "cgst_sgst": "Intra-state · CGST + SGST",
                 "igst": "Inter-state · IGST"}[inv.gst_type]
    canvas.setFont("Helvetica-Bold", 7)
    tw = canvas.stringWidth(label_txt, "Helvetica-Bold", 7)
    chip_x = right_x - tw - 6 * mm
    chip_y = top_y - 32 * mm
    canvas.setStrokeColor(colors.HexColor("#93C5FD"))
    canvas.setFillColorRGB(1, 1, 1, alpha=0.10)
    canvas.roundRect(chip_x, chip_y - 2 * mm, tw + 6 * mm, 5 * mm, 1.5 * mm, stroke=1, fill=1)
    canvas.setFillColor(colors.white)
    canvas.drawString(chip_x + 3 * mm, chip_y - 0.5 * mm, label_txt)

    # ID strip (GSTIN/PAN/StateCode)
    id_bits = []
    if company.gstin: id_bits.append(("GSTIN", company.gstin))
    if company.pan: id_bits.append(("PAN", company.pan))
    if company.state_code: id_bits.append(("State Code", company.state_code))
    if id_bits:
        strip_h = 8 * mm
        canvas.setFillColor(BLUE)
        canvas.rect(0, page_h - band_h - strip_h, page_w, strip_h, stroke=0, fill=1)
        col_w = page_w / max(len(id_bits), 1)
        for i, (lbl, val) in enumerate(id_bits):
            base_x = 15 * mm + i * col_w
            canvas.setFillColor(colors.HexColor("#BFDBFE"))
            canvas.setFont("Helvetica-Bold", 6.5)
            canvas.drawString(base_x, page_h - band_h - 3 * mm, lbl.upper())
            canvas.setFillColor(colors.white)
            canvas.setFont("Courier-Bold", 9)
            canvas.drawString(base_x, page_h - band_h - 6.5 * mm, val)

    # Footer
    canvas.setFillColor(INK_SOFT)
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString(page_w / 2, 8 * mm, "This is a computer-generated invoice.")
    canvas.drawRightString(page_w - 15 * mm, 8 * mm, f"Page {canvas.getPageNumber()}")

    canvas.restoreState()


def build_invoice_pdf(inv: Invoice, company: Company) -> bytes:
    """Build a premium blue/white A4 invoice PDF matching the on-screen preview."""
    buf = io.BytesIO()

    band_h_mm = 42
    strip_h_mm = 8 if (company.gstin or company.pan or company.state_code) else 0
    top_offset = band_h_mm + strip_h_mm + 6  # padding after header
    doc = BaseDocTemplate(
        buf, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=top_offset * mm, bottomMargin=16 * mm,
        title=f"Invoice {inv.invoice_number}",
    )
    # Attach state for the page painter
    doc.company = company
    doc.invoice = inv

    frame = Frame(doc.leftMargin, doc.bottomMargin,
                  doc.width, doc.height, showBoundary=0)
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=_draw_page)])

    # ---------- Styles ----------
    body = ParagraphStyle("body", fontName="Helvetica", fontSize=9, leading=12, textColor=INK)
    body_sm = ParagraphStyle("body_sm", fontName="Helvetica", fontSize=8, leading=11, textColor=INK)
    muted = ParagraphStyle("muted", fontName="Helvetica", fontSize=8, leading=11, textColor=INK_MUTED)
    label = ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=7, leading=10, textColor=BLUE)
    mono = ParagraphStyle("mono", fontName="Courier", fontSize=8, leading=11, textColor=INK)

    story = []

    # ---------- Bill To + meta ----------
    bill_lines = [
        Paragraph("BILL TO", label),
        Paragraph(f"<b>{inv.customer_name}</b>", body),
    ]
    if inv.customer_address:
        bill_lines.append(Paragraph(inv.customer_address.replace("\n", "<br/>"), body_sm))
    city_line = ", ".join(x for x in [inv.customer_city, inv.customer_state, inv.customer_pincode] if x)
    if city_line:
        bill_lines.append(Paragraph(city_line, body_sm))
    if inv.customer_phone or inv.customer_email:
        bill_lines.append(Paragraph(" · ".join(x for x in [inv.customer_phone, inv.customer_email] if x), muted))
    if inv.customer_gstin:
        bill_lines.append(Spacer(1, 2))
        bill_lines.append(Paragraph(f"GSTIN: <font face='Courier-Bold'>{inv.customer_gstin}</font>", body_sm))
        if inv.customer_state_code:
            bill_lines.append(Paragraph(f"State Code: <font face='Courier'>{inv.customer_state_code}</font>", body_sm))

    meta = Table(
        [
            [Paragraph("PLACE OF SUPPLY", label), Paragraph("FISCAL YEAR", label)],
            [Paragraph(inv.customer_state or "—", body_sm), Paragraph(inv.fiscal_year, body_sm)],
            [Paragraph("STATUS", label), Paragraph("PAYMENT", label)],
            [Paragraph(inv.status.title(), body_sm), Paragraph(inv.payment_status.title(), body_sm)],
        ],
        colWidths=[42 * mm, 42 * mm],
    )
    meta.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.4, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
        ("BACKGROUND", (0, 0), (-1, 0), BLUE_BG),
        ("BACKGROUND", (0, 2), (-1, 2), BLUE_BG),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))

    two_col = Table([[bill_lines, meta]], colWidths=[95 * mm, 85 * mm])
    two_col.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(two_col)
    story.append(Spacer(1, 12))

    # ---------- Items table ----------
    headers = ["#", "Docket No.", "Date", "Destination", "Courier", "Mode", "Wt.", "Pcs", "Amount"]
    header_row = [Paragraph(f"<font color='white'><b>{h}</b></font>", body_sm) for h in headers]
    data = [header_row]
    for i, it in enumerate(inv.items, start=1):
        data.append([
            str(i),
            Paragraph(f"<font face='Courier'>{it.docket_no}</font>", body_sm),
            it.date,
            it.destination,
            it.partner_name,
            it.mode,
            f"{it.weight:g}",
            str(it.pieces),
            f"{it.amount:.2f}",
        ])

    items_table = Table(
        data,
        colWidths=[8 * mm, 26 * mm, 18 * mm, 30 * mm, 30 * mm, 18 * mm, 12 * mm, 10 * mm, 28 * mm],
        repeatRows=1,
    )
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (6, 0), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BLUE_BG]),
        ("LINEBELOW", (0, 0), (-1, -1), 0.3, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 10))

    # ---------- Totals block ----------
    totals_rows = [["Subtotal", f"{inv.subtotal:.2f}"]]
    if inv.gst_type == "cgst_sgst":
        totals_rows.append([f"CGST @ {(inv.tax_rate / 2):.2f}%", f"{inv.cgst:.2f}"])
        totals_rows.append([f"SGST @ {(inv.tax_rate / 2):.2f}%", f"{inv.sgst:.2f}"])
    elif inv.gst_type == "igst":
        totals_rows.append([f"IGST @ {inv.tax_rate:.2f}%", f"{inv.igst:.2f}"])
    if inv.round_off:
        totals_rows.append(["Round Off", f"{inv.round_off:.2f}"])
    totals_rows.append(["GRAND TOTAL (INR)", f"₹ {inv.total:,.2f}"])

    totals = Table(totals_rows, colWidths=[48 * mm, 40 * mm], hAlign="RIGHT")
    totals.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -2), 9),
        ("FONTSIZE", (0, -1), (-1, -1), 12),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("TEXTCOLOR", (0, 0), (-1, -2), INK),
        ("BACKGROUND", (0, 0), (-1, -2), BLUE_BG),
        ("BOX", (0, 0), (-1, -2), 0.4, BLUE_LIGHT),
        ("TOPPADDING", (0, 0), (-1, -2), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -2), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, -1), (-1, -1), BLUE_DARK),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("TOPPADDING", (0, -1), (-1, -1), 7),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 7),
    ]))
    story.append(totals)
    story.append(Spacer(1, 14))

    # ---------- Bank + Notes + Signature ----------
    bank_lines = []
    if company.bank_name or company.bank_account:
        bank_lines.append(Paragraph("BANK DETAILS", label))
        if company.bank_name:
            bank_lines.append(Paragraph(f"<b>{company.bank_name}</b>", body_sm))
        if company.bank_account:
            bank_lines.append(Paragraph(f"A/C No: <font face='Courier'>{company.bank_account}</font>", body_sm))
        if company.bank_ifsc:
            bank_lines.append(Paragraph(f"IFSC: <font face='Courier'>{company.bank_ifsc}</font>", body_sm))
        if company.bank_branch:
            bank_lines.append(Paragraph(f"Branch: {company.bank_branch}", body_sm))

    notes_lines = []
    if inv.notes:
        notes_lines.append(Paragraph("NOTES", label))
        notes_lines.append(Paragraph(inv.notes.replace("\n", "<br/>"), body_sm))
    if inv.terms:
        notes_lines.append(Spacer(1, 4))
        notes_lines.append(Paragraph("TERMS &amp; CONDITIONS", label))
        notes_lines.append(Paragraph(inv.terms.replace("\n", "<br/>"), body_sm))

    left_stack = bank_lines + ([Spacer(1, 6)] if bank_lines and notes_lines else []) + notes_lines
    if not left_stack:
        left_stack = [Spacer(1, 1)]

    # Signature stack (right)
    sig_img = _asset_image(company.signature, 48, 18)
    stamp_img = _asset_image(company.stamp, 32, 26)

    sig_visuals = []
    if stamp_img and sig_img:
        sig_visuals = [Table([[stamp_img, sig_img]], colWidths=[36 * mm, 52 * mm],
                              style=TableStyle([("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                                                ("VALIGN", (0, 0), (-1, -1), "BOTTOM")]))]
    elif sig_img:
        sig_visuals = [sig_img]
    elif stamp_img:
        sig_visuals = [stamp_img]
    else:
        sig_visuals = [Spacer(1, 22 * mm)]

    sig_stack = list(sig_visuals) + [
        Spacer(1, 2),
        Table([[""]], colWidths=[75 * mm],
              style=TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.75, BLUE_DARK)])),
        Paragraph(f"<b>For {company.name or 'SD ENTERPRISES'}</b>", body_sm),
        Paragraph("<font color='#1D4ED8'>AUTHORISED SIGNATORY</font>", label),
    ]

    footer_split = Table(
        [[left_stack, sig_stack]],
        colWidths=[95 * mm, 85 * mm],
    )
    footer_split.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ]))
    story.append(footer_split)

    doc.build(story)
    return buf.getvalue()
