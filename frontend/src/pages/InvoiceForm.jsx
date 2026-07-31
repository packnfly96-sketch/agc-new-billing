import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { invoicesApi, customersApi, partnersApi } from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft } from "lucide-react";

const emptyItem = () => ({
  docket_no: "", date: new Date().toISOString().slice(0, 10),
  destination: "", partner_id: "", partner_name: "",
  mode: "Surface", weight: 0, pieces: 1, amount: 0,
});

const MODES = ["Surface", "Air", "Express", "International"];

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);
  const { company } = useCompany();

  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [nextNumber, setNextNumber] = useState("");
  const [form, setForm] = useState({
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    customer_id: "",
    items: [emptyItem()],
    gst_type: "none",
    tax_rate: 18,
    notes: "",
    terms: "",
    status: "issued",
    payment_status: "unpaid",
  });
  const [saving, setSaving] = useState(false);
  const [existingNumber, setExistingNumber] = useState("");

  useEffect(() => {
    Promise.all([customersApi.list(), partnersApi.list()]).then(([c, p]) => {
      setCustomers(c); setPartners(p);
    });
    if (!editing) invoicesApi.nextNumber().then((r) => setNextNumber(r.next_number));
  }, [editing]);

  useEffect(() => {
    if (editing) {
      invoicesApi.get(id).then((inv) => {
        setExistingNumber(inv.invoice_number);
        setForm({
          invoice_date: inv.invoice_date,
          due_date: inv.due_date || "",
          customer_id: inv.customer_id,
          items: inv.items?.length ? inv.items : [emptyItem()],
          gst_type: inv.gst_type,
          tax_rate: inv.tax_rate,
          notes: inv.notes || "",
          terms: inv.terms || "",
          status: inv.status,
          payment_status: inv.payment_status,
        });
      });
    } else if (company?.default_terms && !form.terms) {
      setForm((f) => ({ ...f, terms: company.default_terms, tax_rate: company.default_tax_rate ?? 18 }));
    }
  }, [editing, id, company?.updated_at]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-suggest GST type based on states
  const selectedCustomer = customers.find((c) => c.id === form.customer_id);
  useEffect(() => {
    if (!selectedCustomer || !company?.state_code || !selectedCustomer.state_code) return;
    if (form.gst_type === "none") return;
    const shouldBe = selectedCustomer.state_code === company.state_code ? "cgst_sgst" : "igst";
    if (form.gst_type !== shouldBe) setForm((f) => ({ ...f, gst_type: shouldBe }));
  }, [selectedCustomer?.state_code, company?.state_code]);  // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((s, it) => s + Number(it.amount || 0), 0);
    const rate = Number(form.tax_rate) || 0;
    let cgst = 0, sgst = 0, igst = 0;
    if (form.gst_type === "cgst_sgst") { cgst = subtotal * (rate / 2) / 100; sgst = cgst; }
    else if (form.gst_type === "igst") { igst = subtotal * rate / 100; }
    const totalTax = cgst + sgst + igst;
    const rawTotal = subtotal + totalTax;
    const rounded = Math.round(rawTotal);
    const roundOff = rounded - rawTotal;
    return { subtotal, cgst, sgst, igst, totalTax, roundOff, total: rounded };
  }, [form.items, form.tax_rate, form.gst_type]);

  const updateItem = (idx, field, value) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, [field]: value };
        if (field === "partner_id") {
          const p = partners.find((pp) => pp.id === value);
          next.partner_name = p?.name || "";
        }
        return next;
      }),
    }));
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx) =>
    setForm((f) => ({ ...f, items: f.items.length === 1 ? [emptyItem()] : f.items.filter((_, i) => i !== idx) }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) return toast.error("Please select a customer");
    if (!form.items.some((it) => (it.docket_no || it.destination) && Number(it.amount) > 0))
      return toast.error("Add at least one billable line");

    setSaving(true);
    try {
      const payload = {
        ...form,
        tax_rate: Number(form.tax_rate) || 0,
        items: form.items
          .filter((it) => (it.docket_no || it.destination || Number(it.amount) > 0))
          .map((it) => ({
            docket_no: it.docket_no || "",
            date: it.date || form.invoice_date,
            destination: it.destination || "",
            partner_id: it.partner_id || "",
            partner_name: it.partner_name || "",
            mode: it.mode || "Surface",
            weight: Number(it.weight) || 0,
            pieces: Number(it.pieces) || 1,
            amount: Number(it.amount) || 0,
          })),
      };
      const saved = editing ? await invoicesApi.update(id, payload) : await invoicesApi.create(payload);
      toast.success(editing ? "Invoice updated" : `Invoice ${saved.invoice_number} created`);
      navigate(`/invoices/${saved.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save invoice");
    } finally { setSaving(false); }
  };

  return (
    <div data-testid="invoice-form-page" className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="invoice-back-btn"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <h1 className="font-heading text-3xl tracking-tight font-semibold">
          {editing ? `Edit Invoice · ${existingNumber}` : "New Invoice"}
        </h1>
        {!editing && nextNumber && (
          <span className="ml-auto text-xs uppercase tracking-widest text-slate-500">
            Next #: <span className="font-mono font-semibold text-slate-900">{nextNumber}</span>
          </span>
        )}
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <F label="Invoice date">
              <Input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} data-testid="inv-date" />
            </F>
            <F label="Due date">
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} data-testid="inv-due-date" />
            </F>
            <F label="Customer *">
              <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                <SelectTrigger data-testid="inv-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.length === 0 && <div className="p-2 text-xs text-slate-500">Add a customer first</div>}
                  {customers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </F>
          </div>

          {selectedCustomer && (
            <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
              <div className="font-medium text-slate-900">{selectedCustomer.name}</div>
              <div>{[selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.pincode].filter(Boolean).join(", ")}</div>
              {selectedCustomer.gstin && <div>GSTIN: <span className="font-mono">{selectedCustomer.gstin}</span></div>}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">Consignments</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="inv-add-item"><Plus className="h-4 w-4" /> Add row</Button>
            </div>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="text-left text-slate-500 uppercase tracking-widest border-b border-slate-200">
                    <th className="py-2 pr-2">Docket #</th>
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Destination</th>
                    <th className="py-2 pr-2">Partner</th>
                    <th className="py-2 pr-2">Mode</th>
                    <th className="py-2 pr-2 w-16">Wt</th>
                    <th className="py-2 pr-2 w-14">Pcs</th>
                    <th className="py-2 pr-2 w-24">Amount</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {form.items.map((it, idx) => (
                    <tr key={idx} data-testid={`inv-item-row-${idx}`}>
                      <td className="py-1.5 pr-2"><Input className="h-8" value={it.docket_no} onChange={(e) => updateItem(idx, "docket_no", e.target.value)} data-testid={`inv-item-docket-${idx}`} /></td>
                      <td className="py-1.5 pr-2"><Input type="date" className="h-8" value={it.date} onChange={(e) => updateItem(idx, "date", e.target.value)} /></td>
                      <td className="py-1.5 pr-2"><Input className="h-8" value={it.destination} onChange={(e) => updateItem(idx, "destination", e.target.value)} data-testid={`inv-item-dest-${idx}`} /></td>
                      <td className="py-1.5 pr-2">
                        <Select value={it.partner_id} onValueChange={(v) => updateItem(idx, "partner_id", v)}>
                          <SelectTrigger className="h-8" data-testid={`inv-item-partner-${idx}`}><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            {partners.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-1.5 pr-2">
                        <Select value={it.mode} onValueChange={(v) => updateItem(idx, "mode", v)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MODES.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-1.5 pr-2"><Input type="number" step="0.01" className="h-8 text-right" value={it.weight} onChange={(e) => updateItem(idx, "weight", e.target.value)} /></td>
                      <td className="py-1.5 pr-2"><Input type="number" className="h-8 text-right" value={it.pieces} onChange={(e) => updateItem(idx, "pieces", e.target.value)} /></td>
                      <td className="py-1.5 pr-2"><Input type="number" step="0.01" className="h-8 text-right" value={it.amount} onChange={(e) => updateItem(idx, "amount", e.target.value)} data-testid={`inv-item-amount-${idx}`} /></td>
                      <td>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => removeItem(idx)} aria-label="Remove row" data-testid={`inv-item-remove-${idx}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="inv-notes" /></F>
            <F label="Terms & Conditions"><Textarea rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} data-testid="inv-terms" /></F>
          </div>
        </Card>

        <Card className="p-6 space-y-4 h-fit">
          <h3 className="font-heading text-lg font-medium tracking-tight">Billing Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <F label="GST Type">
              <Select value={form.gst_type} onValueChange={(v) => setForm({ ...form, gst_type: v })}>
                <SelectTrigger data-testid="inv-gst-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non-GST</SelectItem>
                  <SelectItem value="cgst_sgst">CGST + SGST</SelectItem>
                  <SelectItem value="igst">IGST</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F label="Tax rate (%)">
              <Input type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} disabled={form.gst_type === "none"} data-testid="inv-tax-rate" />
            </F>
          </div>

          <div className="text-sm space-y-1 pt-2 border-t border-slate-100">
            <Row label="Subtotal" value={`₹${totals.subtotal.toFixed(2)}`} />
            {form.gst_type === "cgst_sgst" && (<>
              <Row label={`CGST (${(form.tax_rate / 2) || 0}%)`} value={`₹${totals.cgst.toFixed(2)}`} />
              <Row label={`SGST (${(form.tax_rate / 2) || 0}%)`} value={`₹${totals.sgst.toFixed(2)}`} />
            </>)}
            {form.gst_type === "igst" && (<Row label={`IGST (${form.tax_rate}%)`} value={`₹${totals.igst.toFixed(2)}`} />)}
            <Row label="Round off" value={`₹${totals.roundOff.toFixed(2)}`} />
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-semibold text-base text-slate-900">
              <span>Total</span><span data-testid="inv-total">₹{totals.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger data-testid="inv-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F label="Payment">
              <Select value={form.payment_status} onValueChange={(v) => setForm({ ...form, payment_status: v })}>
                <SelectTrigger data-testid="inv-payment"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </F>
          </div>

          <Button type="submit" className="w-full" disabled={saving} data-testid="inv-save-btn">
            {saving ? "Saving…" : editing ? "Save changes" : "Create invoice"}
          </Button>
        </Card>
      </form>
    </div>
  );
}

const F = ({ label, children }) => (
  <div>
    <Label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">{label}</Label>
    <div className="mt-1.5">{children}</div>
  </div>
);
const Row = ({ label, value }) => (
  <div className="flex items-center justify-between text-slate-600"><span>{label}</span><span>{value}</span></div>
);
