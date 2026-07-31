import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { invoicesApi, assetUrl } from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Printer, Download, Pencil, Trash2, Copy, Loader2 } from "lucide-react";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { company } = useCompany();
  const [inv, setInv] = useState(null);

  useEffect(() => {
    invoicesApi.get(id).then(setInv).catch(() => toast.error("Invoice not found"));
  }, [id]);

  // Auto-print if ?print=1
  useEffect(() => {
    if (inv && sp.get("print") === "1") {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [inv, sp]);

  const handlePrint = () => window.print();
  const handleDelete = async () => {
    if (!window.confirm("Delete this invoice?")) return;
    try { await invoicesApi.remove(id); toast.success("Invoice deleted"); navigate("/invoices"); }
    catch { toast.error("Delete failed"); }
  };
  const handleDuplicate = async () => {
    try {
      const dup = await invoicesApi.duplicate(id);
      toast.success(`Duplicated as ${dup.invoice_number}`);
      navigate(`/invoices/${dup.id}/edit`);
    } catch { toast.error("Could not duplicate"); }
  };

  if (!inv) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm" data-testid="detail-loading">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading invoice…
      </div>
    );
  }

  const logoSrc = assetUrl(company, "logo");
  const signatureSrc = assetUrl(company, "signature");
  const stampSrc = assetUrl(company, "stamp");
  const fallbackName = company?.name?.trim() || "SD ENTERPRISES";
  const isGst = inv.gst_type !== "none";
  const gstLabel = { none: "Non-GST Invoice", cgst_sgst: "Intra-state · CGST + SGST", igst: "Inter-state · IGST" }[inv.gst_type];

  return (
    <div data-testid="invoice-detail-page" className="space-y-5">
      {/* Toolbar (hidden in print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")} data-testid="detail-back-btn">
          <ArrowLeft className="h-4 w-4" /> Invoices
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePrint} data-testid="print-invoice-btn"><Printer className="h-4 w-4" /> Print</Button>
          <Button variant="outline" asChild data-testid="pdf-invoice-btn">
            <a href={invoicesApi.pdfUrl(inv.id)} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /> PDF</a>
          </Button>
          <Button variant="outline" onClick={handleDuplicate} data-testid="duplicate-invoice-btn"><Copy className="h-4 w-4" /> Duplicate</Button>
          <Button asChild className="bg-blue-700 hover:bg-blue-800" data-testid="edit-invoice-btn">
            <Link to={`/invoices/${inv.id}/edit`}><Pencil className="h-4 w-4" /> Edit</Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete} data-testid="delete-invoice-btn"><Trash2 className="h-4 w-4" /> Delete</Button>
        </div>
      </div>

      {/* Invoice document — A4 aspect on screen */}
      <div className="mx-auto w-full max-w-[900px]">
        <Card className="p-0 overflow-hidden shadow-md print:shadow-none print:border-0" data-testid="invoice-preview">
          {/* Top blue band */}
          <div className="relative bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800 text-white px-10 py-8 print:bg-blue-800">
            <div className="absolute inset-y-0 right-0 w-1/3 opacity-15 [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                {logoSrc ? (
                  <div className="inline-flex items-center justify-center bg-white rounded-md p-2">
                    <img src={logoSrc} alt={fallbackName} data-testid="invoice-logo" style={{ maxHeight: 56, width: "auto", objectFit: "contain" }} />
                  </div>
                ) : (
                  <div data-testid="invoice-company-name" className="font-heading text-3xl tracking-tight font-semibold">
                    {fallbackName}
                  </div>
                )}
                <div className="mt-4 text-xs text-blue-100/90 leading-relaxed space-y-0.5">
                  <div className="font-semibold text-white">{company?.name || "SD ENTERPRISES"}</div>
                  {company?.address && <div>{company.address}</div>}
                  <div>{[company?.city, company?.state, company?.pincode].filter(Boolean).join(", ")}</div>
                  <div>{[company?.phone, company?.email, company?.website].filter(Boolean).join(" · ")}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-200">
                  {isGst ? "Tax Invoice" : "Invoice"}
                </div>
                <div className="font-heading text-3xl tracking-tight font-semibold mt-1">#{inv.invoice_number.split("/").slice(-1)[0]}</div>
                <div className="mt-1 text-[11px] font-mono text-blue-100/90">{inv.invoice_number}</div>
                <div className="mt-3 space-y-0.5 text-xs text-blue-100/90">
                  <div>Date: <span className="text-white font-medium">{inv.invoice_date}</span></div>
                  {inv.due_date && <div>Due: <span className="text-white font-medium">{inv.due_date}</span></div>}
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest bg-white/10 border border-white/20 rounded px-2 py-0.5">
                    {gstLabel}
                  </div>
                </div>
              </div>
            </div>
            {/* GST + PAN bar */}
            {(company?.gstin || company?.pan || company?.state_code) && (
              <div className="relative mt-6 grid grid-cols-3 gap-4 border-t border-white/20 pt-4 text-[11px]">
                {company?.gstin && <Info label="GSTIN" value={company.gstin} />}
                {company?.pan && <Info label="PAN" value={company.pan} />}
                {company?.state_code && <Info label="State Code" value={company.state_code} />}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-10 py-8 space-y-8">
            {/* Bill To + meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-blue-700">Bill To</div>
                <div className="mt-2 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900 text-base">{inv.customer_name}</div>
                  {inv.customer_address && <div className="whitespace-pre-line">{inv.customer_address}</div>}
                  <div>{[inv.customer_city, inv.customer_state, inv.customer_pincode].filter(Boolean).join(", ")}</div>
                  <div className="text-slate-500">{[inv.customer_phone, inv.customer_email].filter(Boolean).join(" · ")}</div>
                  {inv.customer_gstin && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <SoftInfo label="GSTIN" value={inv.customer_gstin} />
                      {inv.customer_state_code && <SoftInfo label="State Code" value={inv.customer_state_code} />}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetaCell label="Place of Supply" value={inv.customer_state || "—"} />
                <MetaCell label="Fiscal Year" value={inv.fiscal_year} />
                <MetaCell label="Status" value={inv.status} />
                <MetaCell label="Payment" value={inv.payment_status} />
              </div>
            </div>

            {/* Line items */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-blue-700 text-white text-left">
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
                <tbody>
                  {inv.items.map((it, i) => (
                    <tr key={i} className={`${i % 2 ? "bg-blue-50/40" : "bg-white"} border-b border-slate-100`}>
                      <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                      <td className="px-3 py-2 font-mono text-slate-900">{it.docket_no}</td>
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
            </div>

            {/* Totals — prominent card */}
            <div className="flex justify-end">
              <div className="w-full sm:w-96 rounded-lg border border-blue-200 bg-blue-50/60 p-5 text-sm">
                <TotalsRow label="Subtotal" value={inv.subtotal} />
                {inv.gst_type === "cgst_sgst" && (<>
                  <TotalsRow label={`CGST @ ${(inv.tax_rate / 2).toFixed(2)}%`} value={inv.cgst} />
                  <TotalsRow label={`SGST @ ${(inv.tax_rate / 2).toFixed(2)}%`} value={inv.sgst} />
                </>)}
                {inv.gst_type === "igst" && <TotalsRow label={`IGST @ ${inv.tax_rate.toFixed(2)}%`} value={inv.igst} />}
                {inv.round_off !== 0 && <TotalsRow label="Round off" value={inv.round_off} />}
                <div className="mt-2 -mx-5 -mb-5 px-5 py-3 bg-blue-800 text-white rounded-b-lg flex items-center justify-between text-base">
                  <span className="font-semibold">Grand Total</span>
                  <span data-testid="preview-total" className="font-heading text-xl tracking-tight font-semibold">₹{inv.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Bank + Notes + Signature */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-200">
              <div className="space-y-4">
                {(company?.bank_name || company?.bank_account) && (
                  <div>
                    <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-blue-700">Bank Details</div>
                    <div className="mt-2 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700 space-y-0.5">
                      {company?.bank_name && <div className="font-semibold text-slate-900">{company.bank_name}</div>}
                      {company?.bank_account && <div>A/C No: <span className="font-mono">{company.bank_account}</span></div>}
                      {company?.bank_ifsc && <div>IFSC: <span className="font-mono">{company.bank_ifsc}</span></div>}
                      {company?.bank_branch && <div>Branch: {company.bank_branch}</div>}
                    </div>
                  </div>
                )}
                {inv.notes && (
                  <div>
                    <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-blue-700">Notes</div>
                    <p className="mt-2 text-xs text-slate-600 whitespace-pre-line">{inv.notes}</p>
                  </div>
                )}
                {inv.terms && (
                  <div>
                    <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-blue-700">Terms &amp; Conditions</div>
                    <p className="mt-2 text-xs text-slate-600 whitespace-pre-line">{inv.terms}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end justify-end text-right">
                <div className="flex items-end gap-4 min-h-[90px]">
                  {stampSrc && <img src={stampSrc} alt="Stamp" data-testid="invoice-stamp" style={{ maxHeight: 100, opacity: 0.92 }} />}
                  {signatureSrc && <img src={signatureSrc} alt="Signature" data-testid="invoice-signature" style={{ maxHeight: 70 }} />}
                </div>
                <div className="mt-2 pt-2 border-t border-blue-800 min-w-[240px]">
                  <div className="text-sm font-semibold text-slate-900">For {fallbackName}</div>
                  <div className="text-[10px] uppercase tracking-widest text-blue-700 mt-0.5">Authorised Signatory</div>
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] uppercase tracking-[0.2em] text-slate-400 pt-2 border-t border-slate-100">
              This is a computer-generated invoice
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

const Info = ({ label, value }) => (
  <div>
    <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-blue-200/90">{label}</div>
    <div className="font-mono text-sm text-white break-all">{value}</div>
  </div>
);
const SoftInfo = ({ label, value }) => (
  <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
    <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</div>
    <div className="font-mono text-slate-900 text-[11px] break-all">{value}</div>
  </div>
);
const MetaCell = ({ label, value }) => (
  <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
    <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">{label}</div>
    <div className="mt-0.5 text-sm text-slate-900 capitalize">{value}</div>
  </div>
);
const TotalsRow = ({ label, value }) => (
  <div className="flex justify-between py-1 text-slate-700"><span>{label}</span><span className="font-medium">₹{Number(value).toFixed(2)}</span></div>
);
