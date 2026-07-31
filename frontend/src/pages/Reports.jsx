import { useEffect, useState } from "react";
import { reportsApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Reports() {
  const [range, setRange] = useState({ start: "", end: "" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (range.start) params.start = range.start;
      if (range.end) params.end = range.end;
      setData(await reportsApi.summary(params));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div data-testid="reports-page" className="space-y-8">
      <div>
        <div className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-500">Analytics</div>
        <h1 className="mt-2 font-heading text-4xl sm:text-5xl tracking-tight leading-none font-semibold text-slate-900">
          Reports
        </h1>
      </div>

      <Card className="p-4 flex flex-wrap items-end gap-4">
        <F label="From"><Input type="date" value={range.start} onChange={(e)=>setRange({...range, start:e.target.value})} data-testid="reports-start" /></F>
        <F label="To"><Input type="date" value={range.end} onChange={(e)=>setRange({...range, end:e.target.value})} data-testid="reports-end" /></F>
        <Button onClick={load} disabled={loading} data-testid="reports-apply-btn">{loading ? "Loading…" : "Apply"}</Button>
        <Button variant="ghost" onClick={()=>{ setRange({start:"",end:""}); setTimeout(load, 0); }} data-testid="reports-reset-btn">Reset</Button>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Stat label="Invoices" value={data.totals.invoices} />
            <Stat label="Gross" value={`₹${data.totals.gross.toLocaleString("en-IN")}`} />
            <Stat label="Taxable" value={`₹${data.totals.taxable.toLocaleString("en-IN")}`} />
            <Stat label="Tax" value={`₹${data.totals.tax.toLocaleString("en-IN")}`} />
            <Stat label="Outstanding" value={`₹${data.totals.unpaid.toLocaleString("en-IN")}`} tone="warn" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="font-heading text-lg font-medium tracking-tight mb-3">GST Summary</h3>
              <ul className="text-sm divide-y divide-slate-100">
                <RowLI label="CGST" value={`₹${data.gst.cgst.toFixed(2)}`} />
                <RowLI label="SGST" value={`₹${data.gst.sgst.toFixed(2)}`} />
                <RowLI label="IGST" value={`₹${data.gst.igst.toFixed(2)}`} />
                <RowLI label="Total tax" value={`₹${(data.totals.tax).toFixed(2)}`} bold />
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="font-heading text-lg font-medium tracking-tight mb-3">Top Customers</h3>
              {data.top_customers.length === 0 ? <div className="text-sm text-slate-500">No data</div> :
                <ul className="text-sm divide-y divide-slate-100">
                  {data.top_customers.map((c) => <RowLI key={c.name} label={c.name} value={`₹${c.amount.toFixed(2)}`} />)}
                </ul>}
            </Card>

            <Card className="p-6">
              <h3 className="font-heading text-lg font-medium tracking-tight mb-3">Top Courier Partners</h3>
              {data.top_partners.length === 0 ? <div className="text-sm text-slate-500">No data</div> :
                <ul className="text-sm divide-y divide-slate-100">
                  {data.top_partners.map((p) => <RowLI key={p.name} label={p.name} value={`₹${p.amount.toFixed(2)}`} />)}
                </ul>}
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-heading text-lg font-medium tracking-tight mb-3">Monthly Sales</h3>
            {data.monthly.length === 0 ? <div className="text-sm text-slate-500">No data</div> :
              <div className="space-y-2">
                {data.monthly.map((m) => {
                  const max = Math.max(...data.monthly.map((x) => x.amount));
                  const pct = max ? (m.amount / max) * 100 : 0;
                  return (
                    <div key={m.month} className="flex items-center gap-3">
                      <div className="w-20 text-xs font-mono text-slate-500">{m.month}</div>
                      <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                        <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-28 text-right text-sm font-medium">₹{m.amount.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>}
          </Card>
        </>
      )}
    </div>
  );
}

const F = ({ label, children }) => (
  <div>
    <Label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">{label}</Label>
    <div className="mt-1.5">{children}</div>
  </div>
);
const Stat = ({ label, value, tone = "default" }) => (
  <Card className="p-4">
    <div className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">{label}</div>
    <div className={`mt-2 font-heading text-xl tracking-tight font-semibold ${
      tone === "warn" ? "text-amber-700" : "text-slate-900"
    }`}>{value}</div>
  </Card>
);
const RowLI = ({ label, value, bold }) => (
  <li className={`py-2 flex justify-between ${bold ? "font-semibold text-slate-900" : "text-slate-700"}`}>
    <span className="truncate pr-3">{label}</span><span>{value}</span>
  </li>
);
