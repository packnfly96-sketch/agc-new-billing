import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { invoicesApi, customersApi, reportsApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus, FileText, Search, MoreHorizontal, Eye, Pencil, Printer, Download,
  Copy, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, FileSpreadsheet, X,
} from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function InvoicesList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  // Filters
  const [q, setQ] = useState("");
  const [numQ, setNumQ] = useState("");
  const [customerId, setCustomerId] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [payment, setPayment] = useState("all");

  // Sorting
  const [sortKey, setSortKey] = useState("invoice_date");
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Excel export
  const now = new Date();
  const [expYear, setExpYear] = useState(now.getFullYear());
  const [expMonth, setExpMonth] = useState(now.getMonth() + 1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([invoicesApi.list(), customersApi.list()])
      .then(([inv, cus]) => { setInvoices(inv); setCustomers(cus); })
      .finally(() => setLoading(false));
  }, [refreshTick]);

  // Derived: filtered + sorted rows
  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      if (q && !`${i.invoice_number} ${i.customer_name}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (numQ && !(i.invoice_number || "").toLowerCase().includes(numQ.toLowerCase())) return false;
      if (customerId !== "all" && i.customer_id !== customerId) return false;
      if (fromDate && (i.invoice_date || "") < fromDate) return false;
      if (toDate && (i.invoice_date || "") > toDate) return false;
      if (payment !== "all" && i.payment_status !== payment) return false;
      return true;
    });
  }, [invoices, q, numQ, customerId, fromDate, toDate, payment]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string" || typeof bv === "string") {
        av = (av ?? "").toString().toLowerCase();
        bv = (bv ?? "").toString().toLowerCase();
      } else {
        av = av ?? 0; bv = bv ?? 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [filtered, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [q, numQ, customerId, fromDate, toDate, payment, pageSize]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const clearFilters = () => {
    setQ(""); setNumQ(""); setCustomerId("all"); setFromDate(""); setToDate(""); setPayment("all");
  };

  // Row actions
  const doPrint = async (id) => {
    // Navigate to detail and auto-print. Simpler: open detail in new tab with print flag.
    window.open(`/invoices/${id}?print=1`, "_blank");
  };
  const doPdf = (id) => window.open(invoicesApi.pdfUrl(id), "_blank");
  const doDuplicate = async (id) => {
    try {
      const dup = await invoicesApi.duplicate(id);
      toast.success(`Duplicated as ${dup.invoice_number}`);
      setRefreshTick((t) => t + 1);
    } catch { toast.error("Could not duplicate invoice"); }
  };
  const doDelete = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.invoice_number}?`)) return;
    try {
      await invoicesApi.remove(inv.id);
      toast.success("Invoice deleted");
      setRefreshTick((t) => t + 1);
    } catch { toast.error("Delete failed"); }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      await reportsApi.downloadMonthlyExcel(expYear, expMonth);
      toast.success(`Exported ${MONTHS[expMonth - 1]} ${expYear}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Export failed");
    } finally { setExporting(false); }
  };

  const anyFilter = q || numQ || customerId !== "all" || fromDate || toDate || payment !== "all";

  return (
    <div data-testid="invoices-page" className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-semibold tracking-[0.15em] uppercase text-blue-700">Billing</div>
          <h1 className="mt-1 font-heading text-3xl sm:text-4xl tracking-tight leading-none font-semibold text-slate-900">
            Invoices
          </h1>
          <p className="mt-2 text-sm text-slate-500">{sorted.length} of {invoices.length} shown</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 h-10">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <Select value={String(expMonth)} onValueChange={(v)=>setExpMonth(Number(v))}>
              <SelectTrigger className="h-8 w-32 border-0 shadow-none focus:ring-0" data-testid="export-month"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={m} value={String(i+1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              type="number"
              className="h-8 w-20 border-0 shadow-none focus-visible:ring-0"
              value={expYear}
              onChange={(e)=>setExpYear(Number(e.target.value))}
              data-testid="export-year"
            />
            <Button size="sm" onClick={exportExcel} disabled={exporting} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" data-testid="export-excel-btn">
              <Download className="h-4 w-4" /> {exporting ? "Exporting…" : "Export Excel"}
            </Button>
          </div>
          <Button asChild className="bg-blue-700 hover:bg-blue-800" data-testid="new-invoice-btn">
            <Link to="/invoices/new"><Plus className="h-4 w-4" /> New Invoice</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input data-testid="filter-search" placeholder="Search invoice # or customer…" className="pl-9 h-10" value={q} onChange={(e)=>setQ(e.target.value)} />
          </div>
          <Input data-testid="filter-number" placeholder="Invoice #" className="h-10" value={numQ} onChange={(e)=>setNumQ(e.target.value)} />
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="h-10" data-testid="filter-customer"><SelectValue placeholder="Customer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customers</SelectItem>
              {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input data-testid="filter-from" type="date" className="h-10" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} placeholder="From" />
          <Input data-testid="filter-to" type="date" className="h-10" value={toDate} onChange={(e)=>setToDate(e.target.value)} placeholder="To" />
          <div className="lg:col-span-6 flex items-center gap-2 flex-wrap">
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger className="h-9 w-40" data-testid="filter-payment"><SelectValue placeholder="Payment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            {anyFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="clear-filters">
                <X className="h-3.5 w-3.5" /> Clear filters
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Label className="text-xs text-slate-500">Rows</Label>
              <Select value={String(pageSize)} onValueChange={(v)=>setPageSize(Number(v))}>
                <SelectTrigger className="h-9 w-20" data-testid="page-size"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10,20,50,100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-10 text-sm text-slate-500">Loading invoices…</div>
        ) : sorted.length === 0 ? (
          <div className="p-14 text-center">
            <FileText className="h-8 w-8 mx-auto text-slate-400" />
            <p className="mt-3 text-slate-600 text-sm">
              {invoices.length === 0 ? "No invoices yet." : "No invoices match the filters."}
            </p>
            {invoices.length === 0 && (
              <Button asChild className="mt-4 bg-blue-700 hover:bg-blue-800" data-testid="empty-new-invoice-btn">
                <Link to="/invoices/new">Create your first invoice</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">
                <tr>
                  <SortableTh label="Invoice #" col="invoice_number" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("invoice_number")} />
                  <SortableTh label="Date" col="invoice_date" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("invoice_date")} />
                  <SortableTh label="Customer" col="customer_name" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort("customer_name")} />
                  <th className="px-4 py-3">GST</th>
                  <th className="px-4 py-3">Payment</th>
                  <SortableTh label="Total" col="total" sortKey={sortKey} sortDir={sortDir} align="right" onClick={() => toggleSort("total")} />
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((inv) => (
                  <tr key={inv.id} className="hover:bg-blue-50/30 transition-colors" data-testid={`invoice-row-${inv.id}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link to={`/invoices/${inv.id}`} className="hover:text-blue-700">{inv.invoice_number}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{inv.invoice_date}</td>
                    <td className="px-4 py-3 text-slate-700">{inv.customer_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">
                        {inv.gst_type === "none" ? "Non-GST" : inv.gst_type === "igst" ? "IGST" : "CGST+SGST"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={
                        inv.payment_status === "paid" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" :
                        inv.payment_status === "partial" ? "bg-amber-50 text-amber-700 hover:bg-amber-50" :
                        "bg-slate-100 text-slate-700 hover:bg-slate-100"
                      }>
                        {inv.payment_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 whitespace-nowrap">
                      ₹{(inv.total || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn testId={`row-view-${inv.id}`} label="View" onClick={() => navigate(`/invoices/${inv.id}`)}><Eye className="h-4 w-4" /></IconBtn>
                        <IconBtn testId={`row-edit-${inv.id}`} label="Edit" onClick={() => navigate(`/invoices/${inv.id}/edit`)}><Pencil className="h-4 w-4" /></IconBtn>
                        <IconBtn testId={`row-pdf-${inv.id}`} label="PDF" onClick={() => doPdf(inv.id)}><Download className="h-4 w-4" /></IconBtn>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              aria-label="More actions"
                              data-testid={`row-menu-${inv.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onSelect={() => navigate(`/invoices/${inv.id}`)} data-testid={`menu-view-${inv.id}`}>
                              <Eye className="h-4 w-4" /> View invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => navigate(`/invoices/${inv.id}/edit`)} data-testid={`menu-edit-${inv.id}`}>
                              <Pencil className="h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => doPrint(inv.id)} data-testid={`menu-print-${inv.id}`}>
                              <Printer className="h-4 w-4" /> Print
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => doPdf(inv.id)} data-testid={`menu-pdf-${inv.id}`}>
                              <Download className="h-4 w-4" /> Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => doDuplicate(inv.id)} data-testid={`menu-duplicate-${inv.id}`}>
                              <Copy className="h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => doDelete(inv)}
                              className="text-red-600 focus:text-red-700 focus:bg-red-50"
                              data-testid={`menu-delete-${inv.id}`}
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600" data-testid="pagination">
          <div>
            Page <span className="font-medium text-slate-900">{currentPage}</span> of {totalPages}
            <span className="mx-2 text-slate-300">·</span>
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} data-testid="page-prev">
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} data-testid="page-next">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const SortableTh = ({ label, col, sortKey, sortDir, onClick, align = "left" }) => {
  const active = sortKey === col;
  return (
    <th
      className={`px-4 py-3 select-none cursor-pointer ${align === "right" ? "text-right" : ""}`}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "text-blue-700" : "text-slate-400"}`} />
        {active && <span className="sr-only">{sortDir}</span>}
      </span>
    </th>
  );
};

const IconBtn = ({ children, onClick, label, testId }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    data-testid={testId}
    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
  >
    {children}
  </button>
);
