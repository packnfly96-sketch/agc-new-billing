import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { invoicesApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Search } from "lucide-react";

export default function InvoicesList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    invoicesApi.list().then((d) => { setInvoices(d); setLoading(false); });
  }, []);

  const filtered = invoices.filter((i) =>
    !q ||
    (i.invoice_number || "").toLowerCase().includes(q.toLowerCase()) ||
    (i.customer_name || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div data-testid="invoices-page" className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-500">Billing</div>
          <h1 className="mt-2 font-heading text-4xl sm:text-5xl tracking-tight leading-none font-semibold text-slate-900">
            Invoices
          </h1>
        </div>
        <Button asChild data-testid="new-invoice-btn">
          <Link to="/invoices/new"><Plus className="h-4 w-4" /> New Invoice</Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            data-testid="invoice-search"
            placeholder="Search by invoice number or customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 h-9"
          />
        </div>
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-8 w-8 mx-auto text-slate-400" />
            <p className="mt-3 text-slate-600 text-sm">
              {invoices.length === 0 ? "No invoices yet." : "No results match your search."}
            </p>
            {invoices.length === 0 && (
              <Button asChild className="mt-4" data-testid="empty-new-invoice-btn">
                <Link to="/invoices/new">Create your first invoice</Link>
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">GST</th>
                <th className="px-6 py-3">Payment</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors" data-testid={`invoice-row-${inv.id}`}>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <Link to={`/invoices/${inv.id}`} className="hover:text-blue-700">{inv.invoice_number}</Link>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{inv.invoice_date}</td>
                  <td className="px-6 py-4 text-slate-700">{inv.customer_name}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                      {inv.gst_type === "none" ? "Non-GST" : inv.gst_type === "igst" ? "IGST" : "CGST+SGST"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={
                      inv.payment_status === "paid"
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                        : inv.payment_status === "partial"
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-50"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-100"
                    }>
                      {inv.payment_status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    ₹{(inv.total || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
