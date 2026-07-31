import { useEffect, useState } from "react";
import { customersApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users } from "lucide-react";

const empty = {
  name: "", contact_person: "", address: "", city: "", state: "", state_code: "",
  pincode: "", phone: "", email: "", gstin: "", pan: "",
};

export default function Customers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setItems(await customersApi.list());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...empty, ...c }); setOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      if (editing) {
        await customersApi.update(editing.id, form);
        toast.success("Customer updated");
      } else {
        await customersApi.create(form);
        toast.success("Customer added");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete ${c.name}?`)) return;
    try { await customersApi.remove(c.id); toast.success("Customer deleted"); await load(); }
    catch { toast.error("Delete failed"); }
  };

  return (
    <div data-testid="customers-page" className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-500">Master</div>
          <h1 className="mt-2 font-heading text-4xl sm:text-5xl tracking-tight leading-none font-semibold">Customers</h1>
        </div>
        <Button onClick={openNew} data-testid="new-customer-btn"><Plus className="h-4 w-4" /> Add Customer</Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-8 w-8 mx-auto text-slate-400" />
            <p className="mt-3 text-slate-600 text-sm">No customers yet.</p>
            <Button className="mt-4" onClick={openNew} data-testid="empty-new-customer-btn">Add customer</Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">GSTIN</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50" data-testid={`customer-row-${c.id}`}>
                  <td className="px-6 py-4 font-medium text-slate-900">{c.name}
                    {c.contact_person && <div className="text-xs text-slate-500">{c.contact_person}</div>}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{[c.city, c.state].filter(Boolean).join(", ")}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{c.gstin || "—"}</td>
                  <td className="px-6 py-4 text-slate-600">{c.phone || "—"}</td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)} data-testid={`edit-customer-${c.id}`}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(c)} className="text-red-600 hover:text-red-700" data-testid={`delete-customer-${c.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl" data-testid="customer-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle>
            <DialogDescription>Master record used for billing. GSTIN and State Code drive GST type.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Name *"><Input required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} data-testid="cust-name" /></F>
            <F label="Contact person"><Input value={form.contact_person} onChange={(e)=>setForm({...form,contact_person:e.target.value})} data-testid="cust-contact" /></F>
            <F label="Phone"><Input value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} data-testid="cust-phone" /></F>
            <F label="Email"><Input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} data-testid="cust-email" /></F>
            <F label="GSTIN"><Input value={form.gstin} onChange={(e)=>setForm({...form,gstin:e.target.value.toUpperCase()})} data-testid="cust-gstin" /></F>
            <F label="PAN"><Input value={form.pan} onChange={(e)=>setForm({...form,pan:e.target.value.toUpperCase()})} data-testid="cust-pan" /></F>
            <F label="Address" full><Textarea rows={2} value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})} data-testid="cust-address" /></F>
            <F label="City"><Input value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})} data-testid="cust-city" /></F>
            <F label="State"><Input value={form.state} onChange={(e)=>setForm({...form,state:e.target.value})} data-testid="cust-state" /></F>
            <F label="State Code"><Input value={form.state_code} onChange={(e)=>setForm({...form,state_code:e.target.value})} data-testid="cust-state-code" /></F>
            <F label="Pincode"><Input value={form.pincode} onChange={(e)=>setForm({...form,pincode:e.target.value})} data-testid="cust-pincode" /></F>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} data-testid="cust-save-btn">{saving ? "Saving…" : "Save customer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const F = ({ label, children, full }) => (
  <div className={full ? "sm:col-span-2" : ""}>
    <Label className="text-[10px] font-semibold tracking-[0.1em] uppercase text-slate-500">{label}</Label>
    <div className="mt-1.5">{children}</div>
  </div>
);
