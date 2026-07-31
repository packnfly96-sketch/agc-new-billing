import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { invoicesApi, customersApi, partnersApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Settings, ArrowUpRight } from "lucide-react";

export default function Dashboard() {
  const [state, setState] = useState({ invoices: [], customers: 0, partners: 0, loading: true });

  useEffect(() => {
    (async () => {
      const [invoices, customers, partners] = await Promise.all([
        invoicesApi.list(), customersApi.list(), partnersApi.list(),
      ]);
      setState({ invoices, customers: customers.length, partners: partners.length, loading: false });
    })().catch(() => setState((s) => ({ ...s, loading: false })));
  }, []);

  const t = state.invoices.reduce(
    (acc, i) => {
      acc.count += 1;
      acc.value += i.total || 0;
      if (i.payment_status === "paid") acc.paid += i.total || 0;
      else acc.due += i.total || 0;
      return acc;
    },
    { count: 0, value: 0, paid: 0, due: 0 }
  );

  return (
    <div data-testid="dashboard-page" className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-500">Overview</div>
          <h1 className="mt-2 font-heading text-4xl sm:text-5xl tracking-tight leading-none font-semibold text-slate-900">
            Dashboard
          </h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" data-testid="dashboard-settings-btn">
            <Link to="/settings/company"><Settings className="h-4 w-4" /> My Company</Link>
          </Button>
          <Button asChild data-testid="dashboard-new-invoice-btn">
            <Link to="/invoices/new"><Plus className="h-4 w-4" /> New Invoice</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Invoices" value={state.loading ? "—" : t.count} testId="stat-count" />
        <Stat label="Billed" value={state.loading ? "—" : `₹${t.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} testId="stat-billed" />
        <Stat label="Collected" value={state.loading ? "—" : `₹${t.paid.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} testId="stat-collected" tone="success" />
        <Stat label="Outstanding" value={state.loading ? "—" : `₹${t.due.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} testId="stat-outstanding" tone="warn" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-medium tracking-tight">Recent invoices</h2>
            <Link to="/invoices" className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1" data-testid="dashboard-view-all">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {state.invoices.length === 0 ? (
            <div className="text-slate-500 text-sm flex items-center gap-2 py-6">
              <FileText className="h-4 w-4" /> No invoices yet — create your first one.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {state.invoices.slice(0, 6).map((i) => (
                <li key={i.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/invoices/${i.id}`} className="text-sm font-medium text-slate-900 hover:text-blue-700 truncate">
                      {i.invoice_number}
                    </Link>
                    <div className="text-xs text-slate-500 truncate">{i.customer_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">₹{(i.total || 0).toFixed(2)}</div>
                    <div className={`text-[10px] uppercase tracking-widest font-semibold ${i.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                      {i.payment_status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-heading text-xl font-medium tracking-tight">Masters</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            <li className="py-3 flex items-center justify-between">
              <Link to="/customers" className="text-slate-700 hover:text-slate-900">Customers</Link>
              <span className="font-semibold" data-testid="stat-customers">{state.loading ? "—" : state.customers}</span>
            </li>
            <li className="py-3 flex items-center justify-between">
              <Link to="/partners" className="text-slate-700 hover:text-slate-900">Courier Partners</Link>
              <span className="font-semibold" data-testid="stat-partners">{state.loading ? "—" : state.partners}</span>
            </li>
          </ul>
          <Button asChild variant="outline" className="w-full" data-testid="dashboard-reports-btn">
            <Link to="/reports">Open Reports</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}

const Stat = ({ label, value, testId, tone = "default" }) => (
  <Card data-testid={testId} className="p-5">
    <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">{label}</div>
    <div className={`mt-2 font-heading text-2xl tracking-tight font-semibold ${
      tone === "success" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-slate-900"
    }`}>
      {value}
    </div>
  </Card>
);
