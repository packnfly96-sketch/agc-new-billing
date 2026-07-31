"""Premium invoice PDF generator using ReportLab."""
import io
from pathlib import Path
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
)
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER

from db import UPLOAD_ASSETS
from models import Company, Invoice


BRAND = colors.HexColor("#0F172A")
MUTED = colors.HexColor("#64748B")
LINE = colors.HexColor("#CBD5E1")
SOFT = colors.HexColor("#F1F5F9")


def _asset_image(asset, max_w_mm: float, max_h_mm: float) -> Optional[RLImage]:
    """Return an ReportLab Image for a CompanyAsset (skips SVGs)."""
    if not asset:
        return None
    if asset.mime == "image/svg+xml":
        return None  # ReportLab can't render SVG without extra libs
    path = UPLOAD_ASSETS / asset.filename
    if not path.exists():
        return None
    try:
        img = RLImage(str(path))
        max_w = max_w_mm * mm
        max_h = max_h_mm * mm
        ratio = min(max_w / img.imageWidth, max_h / img.imageHeight)
        img.drawWidth = img.imageWidth * ratio
        img.drawHeight = img.imageHeight * ratio
        return img
    except Exception:
        return None


def build_invoice_pdf(inv: Invoice, company: Company) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=14 * mm, rightMargin=14 * mm,
        topMargin=14 * mm, bottomMargin=14 * mm,
        title=f"Invoice {inv.invoice_number}",
    )

    body = ParagraphStyle("body", fontName="Helvetica", fontSize=9, leading=12, textColor=BRAND)
    body_sm = ParagraphStyle("body_sm", fontName="Helvetica", fontSize=8, leading=11, textColor=BRAND)
    muted = ParagraphStyle("muted", fontName="Helvetica", fontSize=8, leading=11, textColor=MUTED)
    label = ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=7, leading=10, textColor=MUTED)
    h_company = ParagraphStyle("h_company", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=BRAND)
    h_invoice = ParagraphStyle("h_invoice", fontName="Helvetica-Bold", fontSize=22, leading=26,
                               textColor=BRAND, alignment=TA_RIGHT)
    right_muted = ParagraphStyle("right_muted", parent=muted, alignment=TA_RIGHT)
    right_body = ParagraphStyle("right_body", parent=body, alignment=TA_RIGHT)
    tax_title = ParagraphStyle("tax_title", fontName="Helvetica-Bold", fontSize=10, leading=13,
                               textColor=colors.white, alignment=TA_CENTER)

    story = []

    # ---------------- Header band ----------------
    logo_img = _asset_image(company.logo, 42, 22)
    left_cell = logo_img if logo_img else Paragraph(company.name or "Your Company", h_company)

    tax_title_text = "TAX INVOICE" if inv.gst_type in ("cgst_sgst", "igst") else "INVOICE"
    invoice_head = [
        Paragraph(tax_title_text, h_invoice),
        Spacer(1, 2),
        Paragraph(f"<b>#</b> {inv.invoice_number}", right_body),
        Paragraph(f"Date: {inv.invoice_date}", right_muted),
        Paragraph(f"Due: {inv.due_date or '—'}", right_muted),
    ]

    header = Table([[left_cell, invoice_head]], colWidths=[90 * mm, 92 * mm])
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(header)
    story.append(Spacer(1, 6))

    # ---------------- Company info band ----------------
    company_lines = []
    if company.name:
        company_lines.append(f"<b>{company.name}</b>")
    addr_bits = [company.address, ", ".join(x for x in [company.city, company.state, company.pincode] if x)]
    company_lines += [x for x in addr_bits if x]
    contact_bits = " · ".join([x for x in [company.phone, company.email, company.website] if x])
    if contact_bits:
        company_lines.append(contact_bits)
    id_bits = []
    if company.gstin:
        id_bits.append(f"GSTIN: <b>{company.gstin}</b>")
    if company.pan:
        id_bits.append(f"PAN: {company.pan}")
    if company.state_code:
        id_bits.append(f"State Code: {company.state_code}")
    if id_bits:
        company_lines.append(" · ".join(id_bits))

    story.append(Paragraph("<br/>".join(company_lines), body_sm))
    story.append(Spacer(1, 8))

    # Divider line
    story.append(Table([[""]], colWidths=[182 * mm], style=TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.75, BRAND),
    ])))
    story.append(Spacer(1, 8))

    # ---------------- Bill To ----------------
    bill_lines = [Paragraph("BILL TO", label), Paragraph(f"<b>{inv.customer_name}</b>", body)]
    if inv.customer_address:
        bill_lines.append(Paragraph(inv.customer_address, body_sm))
    city_line = ", ".join(x for x in [inv.customer_city, inv.customer_state, inv.customer_pincode] if x)
    if city_line:
        bill_lines.append(Paragraph(city_line, body_sm))
    if inv.customer_phone or inv.customer_email:
        bill_lines.append(Paragraph(
            " · ".join(x for x in [inv.customer_phone, inv.customer_email] if x), muted))
    if inv.customer_gstin:
        bill_lines.append(Paragraph(f"GSTIN: <b>{inv.customer_gstin}</b>" +
                                    (f" · State Code: {inv.customer_state_code}" if inv.customer_state_code else ""), body_sm))

    meta_rows = [
        [Paragraph("PLACE OF SUPPLY", label), Paragraph(inv.customer_state or "—", body_sm)],
        [Paragraph("GST TREATMENT", label),
         Paragraph({"none": "Non-GST", "cgst_sgst": "Intra-state (CGST+SGST)", "igst": "Inter-state (IGST)"}[inv.gst_type], body_sm)],
    ]
    meta = Table(meta_rows, colWidths=[35 * mm, 55 * mm])
    meta.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))

    two_col = Table([[bill_lines, meta]], colWidths=[100 * mm, 82 * mm])
    two_col.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(two_col)
    story.append(Spacer(1, 10))

    # ---------------- Items table ----------------
    show_gst_cols = inv.gst_type in ("cgst_sgst", "igst")
    headers = ["#", "Docket No.", "Date", "Destination", "Courier", "Mode", "Wt.", "Pcs", "Amount"]
    header_row = [Paragraph(f"<font color='white'><b>{h}</b></font>", body_sm) for h in headers]
    data = [header_row]
    for i, it in enumerate(inv.items, start=1):
        data.append([
            str(i),
            it.docket_no,
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
        colWidths=[8 * mm, 26 * mm, 20 * mm, 30 * mm, 32 * mm, 20 * mm, 14 * mm, 12 * mm, 20 * mm],
        repeatRows=1,
    )
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (6, 0), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 8))

    # ---------------- Totals block ----------------
    totals_rows = [["Subtotal", f"{inv.subtotal:.2f}"]]
    if inv.gst_type == "cgst_sgst":
        totals_rows.append([f"CGST ({inv.tax_rate / 2:g}%)", f"{inv.cgst:.2f}"])
        totals_rows.append([f"SGST ({inv.tax_rate / 2:g}%)", f"{inv.sgst:.2f}"])
    elif inv.gst_type == "igst":
        totals_rows.append([f"IGST ({inv.tax_rate:g}%)", f"{inv.igst:.2f}"])
    if inv.round_off:
        totals_rows.append(["Round Off", f"{inv.round_off:.2f}"])
    totals_rows.append(["Total (INR)", f"{inv.total:.2f}"])

    totals = Table(totals_rows, colWidths=[45 * mm, 35 * mm], hAlign="RIGHT")
    totals.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEABOVE", (0, -1), (-1, -1), 0.75, BRAND),
        ("BACKGROUND", (0, -1), (-1, -1), BRAND),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 11),
        ("TOPPADDING", (0, -1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 6),
    ]))
    story.append(totals)
    story.append(Spacer(1, 12))

    # ---------------- Bank details + Notes/Terms ----------------
    bank_lines = [Paragraph("BANK DETAILS", label)]
    if company.bank_name:
        bank_lines.append(Paragraph(f"<b>{company.bank_name}</b>", body_sm))
    if company.bank_account:
        bank_lines.append(Paragraph(f"A/C No: {company.bank_account}", body_sm))
    if company.bank_ifsc:
        bank_lines.append(Paragraph(f"IFSC: {company.bank_ifsc}", body_sm))
    if company.bank_branch:
        bank_lines.append(Paragraph(f"Branch: {company.bank_branch}", body_sm))

    notes_lines = []
    if inv.notes:
        notes_lines.append(Paragraph("NOTES", label))
        notes_lines.append(Paragraph(inv.notes.replace("\n", "<br/>"), body_sm))
    if inv.terms:
        notes_lines.append(Spacer(1, 6))
        notes_lines.append(Paragraph("TERMS & CONDITIONS", label))
        notes_lines.append(Paragraph(inv.terms.replace("\n", "<br/>"), body_sm))

    footer_split = Table([[bank_lines, notes_lines or [Spacer(1, 1)]]], colWidths=[90 * mm, 92 * mm])
    footer_split.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(footer_split)
    story.append(Spacer(1, 18))

    # ---------------- Signature + Stamp ----------------
    stamp_img = _asset_image(company.stamp, 30, 24)
    sig_img = _asset_image(company.signature, 45, 18)

    sig_stack = []
    if stamp_img and sig_img:
        sig_stack.append(Table([[stamp_img, sig_img]], colWidths=[35 * mm, 50 * mm],
                                style=TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")])))
    elif sig_img:
        sig_stack.append(sig_img)
    elif stamp_img:
        sig_stack.append(stamp_img)
    else:
        sig_stack.append(Spacer(1, 22 * mm))

    sig_stack.append(Spacer(1, 2))
    sig_stack.append(Table([[""]], colWidths=[85 * mm],
                           style=TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.5, BRAND)])))
    sig_stack.append(Paragraph(f"<b>For {company.name or 'Your Company'}</b>", body_sm))
    sig_stack.append(Paragraph("Authorised Signatory", muted))

    sig_wrap = Table([[Spacer(1, 1), sig_stack]], colWidths=[95 * mm, 87 * mm])
    sig_wrap.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(sig_wrap)

    doc.build(story)
    return buf.getvalue()
