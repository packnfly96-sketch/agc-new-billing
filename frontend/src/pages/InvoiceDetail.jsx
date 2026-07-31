import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { invoicesApi, assetUrl } from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Printer, Download, Pencil, Trash2 } from "lucide-react";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useCompany();
  const [inv, setInv] = useState(null);

  useEffect(() => {
    invoicesApi.get(id).then(setInv).catch(() => toast.error("Invoice not found"));
  }, [id]);

  const handlePrint = () => window.print();
  const handleDelete = async () => {
    if (!window.confirm("Delete this invoice?")) return;
    try { await invoicesApi.remove(id); toast.success("Invoice deleted"); navigate("/invoices"); }
    catch { toast.error("Delete failed"); }
  };

  if (!inv) return <div className="text-slate-500 text-sm">Loading…</div>;

  const logoSrc = assetUrl(company, "logo");
  const signatureSrc = assetUrl(company, "signature");
  const stampSrc = assetUrl(company, "stamp");
  const fallbackName = company?.name?.trim() || "SD ENTERPRISES";
  const isGst = inv.gst_type !== "none";
  const gstLabel = { none: "Non-GST", cgst_sgst: "Intra-state (CGST+SGST)", igst: "Inter-state (IGST)" }[inv.gst_type];

  return (
    <div data-testid="invoice-detail-page" className="space-y-6">
      {/* Toolbar (hidden on print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")} data-testid="detail-back-btn"><ArrowLeft className="h-4 w-4" /> Invoices</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} data-testid="print-invoice-btn"><Printer className="h-4 w-4" /> Print</Button>
          <Button variant="outline" asChild data-testid="pdf-invoice-btn">
            <a href={invoicesApi.pdfUrl(inv.id)} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /> PDF</a>
          </Button>
          <Button asChild data-testid="edit-invoice-btn">
            <Link to={`/invoices/${inv.id}/edit`}><Pencil className="h-4 w-4" /> Edit</Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete} data-testid="delete-invoice-btn"><Trash2 className="h-4 w-4" /> Delete</Button>
        </div>
      </div>

      {/* Printable / preview card */}
      <Card className="p-0 overflow-hidden print:shadow-none print:border-0" data-testid="invoice-preview">
        {/* Header bar */}
        <div className="p-8 border-b border-slate-200 flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            {logoSrc ? (
              <img src={logoSrc} alt={fallbackName} data-testid="invoice-logo" style={{ maxHeight: 60, width: "auto", objectFit: "contain" }} />
            ) : (
              <div data-testid="invoice-company-name" className="font-heading text-3xl tracking-tight font-semibold text-slate-900">
                {fallbackName}
              </div>
            )}
            <div className="mt-3 text-xs text-slate-600 leading-relaxed space-y-0.5">
              {company?.address && <div>{company.address}</div>}
              <div>{[company?.city, company?.state, company?.pincode].filter(Boolean).join(", ")}</div>
              <div>{[company?.phone, company?.email, company?.website].filter(Boolean).join(" · ")}</div>
              <div className="pt-1 text-slate-700">
                {company?.gstin && <>GSTIN: <span className="font-mono font-semibold">{company.gstin}</span></>}
                {company?.pan && <> · PAN: <span className="font-mono">{company.pan}</span></>}
                {company?.state_code && <> · State Code: <span className="font-mono">{company.state_code}</span></>}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-heading text-3xl tracking-tight font-semibold text-slate-900">
              {isGst ? "TAX INVOICE" : "INVOICE"}
            </div>
            <div className="mt-1 text-slate-500 text-sm font-mono">#{inv.invoice_number}</div>
            <div className="mt-3 text-sm text-slate-600 space-y-0.5">
              <div>Date: <span className="text-slate-900">{inv.invoice_date}</span></div>
              {inv.due_date && <div>Due: <span className="text-slate-900">{inv.due_date}</span></div>}
              <div className="text-[10px] uppercase tracking-widest mt-2 text-slate-500">{gstLabel}</div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Bill To + meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">Bill To</div>
              <div className="mt-1 text-sm">
                <div className="font-semibold text-slate-900">{inv.customer_name}</div>
                {inv.customer_address && <div className="text-slate-600 whitespace-pre-line">{inv.customer_address}</div>}
                <div className="text-slate-600">{[inv.customer_city, inv.customer_state, inv.customer_pincode].filter(Boolean).join(", ")}</div>
                <div className="text-slate-600">{[inv.customer_phone, inv.customer_email].filter(Boolean).join(" · ")}</div>
                {inv.customer_gstin && (
                  <div className="pt-1 text-slate-700">
                    GSTIN: <span className="font-mono font-semibold">{inv.customer_gstin}</span>
                    {inv.customer_state_code && <> · State Code: <span className="font-mono">{inv.customer_state_code}</span></>}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <MetaRow label="Place of Supply" value={inv.customer_state || "—"} />
              <MetaRow label="Fiscal Year" value={inv.fiscal_year} />
              <MetaRow label="Status" value={inv.status} />
              <MetaRow label="Payment" value={inv.payment_status} />
            </div>
          </div>

          {/* Items table */}
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-900 text-white text-left">
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">Docket No.</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Destination</th>
                <th className="px-3 py-2">Courier</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2 text-right">Wt.</th>
                <th className="px-3 py-2 text-right">Pcs</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inv.items.map((it, i) => (
                <tr key={i} className={i % 2 ? "bg-slate-50/50" : ""}>
                  <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                  <td className="px-3 py-2 font-mono">{it.docket_no}</td>
                  <td className="px-3 py-2 text-slate-600">{it.date}</td>
                  <td className="px-3 py-2">{it.destination}</td>
                  <td className="px-3 py-2 text-slate-600">{it.partner_name}</td>
                  <td className="px-3 py-2 text-slate-600">{it.mode}</td>
                  <td className="px-3 py-2 text-right">{Number(it.weight) || 0}</td>
                  <td className="px-3 py-2 text-right">{it.pieces}</td>
                  <td className="px-3 py-2 text-right font-medium">₹{Number(it.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-80 text-sm">
              <Row label="Subtotal" value={`₹${inv.subtotal.toFixed(2)}`} />
              {inv.gst_type === "cgst_sgst" && (<>
                <Row label={`CGST (${inv.tax_rate / 2}%)`} value={`₹${inv.cgst.toFixed(2)}`} />
                <Row label={`SGST (${inv.tax_rate / 2}%)`} value={`₹${inv.sgst.toFixed(2)}`} />
              </>)}
              {inv.gst_type === "igst" && <Row label={`IGST (${inv.tax_rate}%)`} value={`₹${inv.igst.toFixed(2)}`} />}
              {inv.round_off !== 0 && <Row label="Round off" value={`₹${inv.round_off.toFixed(2)}`} />}
              <div className="mt-1 -mx-2 px-4 py-2 bg-slate-900 text-white flex justify-between items-center font-semibold rounded">
                <span>Total (INR)</span>
                <span data-testid="preview-total">₹{inv.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Bank + notes/terms + signature */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            <div className="space-y-3">
              {(company?.bank_name || company?.bank_account) && (
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">Bank Details</div>
                  <div className="mt-1 text-xs text-slate-700 space-y-0.5">
                    {company?.bank_name && <div className="font-semibold">{company.bank_name}</div>}
                    {company?.bank_account && <div>A/C No: <span className="font-mono">{company.bank_account}</span></div>}
                    {company?.bank_ifsc && <div>IFSC: <span className="font-mono">{company.bank_ifsc}</span></div>}
                    {company?.bank_branch && <div>Branch: {company.bank_branch}</div>}
                  </div>
                </div>
              )}
              {inv.notes && (
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">Notes</div>
                  <p className="mt-1 text-xs text-slate-600 whitespace-pre-line">{inv.notes}</p>
                </div>
              )}
              {inv.terms && (
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">Terms & Conditions</div>
                  <p className="mt-1 text-xs text-slate-600 whitespace-pre-line">{inv.terms}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end justify-end text-right">
              <div className="flex items-end gap-3 min-h-[80px]">
                {stampSrc && <img src={stampSrc} alt="Stamp" data-testid="invoice-stamp" style={{ maxHeight: 90, opacity: 0.9 }} />}
                {signatureSrc && <img src={signatureSrc} alt="Signature" data-testid="invoice-signature" style={{ maxHeight: 60 }} />}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-900 min-w-[220px]">
                <div className="text-xs font-semibold text-slate-900">For {fallbackName}</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

const Row = ({ label, value }) => (
  <div className="flex justify-between py-1 text-slate-600"><span>{label}</span><span className="text-slate-900">{value}</span></div>
);
const MetaRow = ({ label, value }) => (
  <div>
    <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">{label}</div>
    <div className="mt-0.5 text-slate-900">{value}</div>
  </div>
);
