import { useEffect, useState } from "react";
import { partnersApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";

const empty = { name: "", code: "", contact_person: "", phone: "", email: "", address: "" };

export default function CourierPartners() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => { setLoading(true); setItems(await partnersApi.list()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...empty, ...p }); setOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Partner name is required");
    setSaving(true);
    try {
      if (editing) { await partnersApi.update(editing.id, form); toast.success("Partner updated"); }
      else { await partnersApi.create(form); toast.success("Partner added"); }
      setOpen(false);
      await load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    try { await partnersApi.remove(p.id); toast.success("Partner deleted"); await load(); }
    catch { toast.error("Delete failed"); }
  };

  return (
    <div data-testid="partners-page" className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-500">Master</div>
          <h1 className="mt-2 font-heading text-4xl sm:text-5xl tracking-tight leading-none font-semibold">Courier Partners</h1>
        </div>
        <Button onClick={openNew} data-testid="new-partner-btn"><Plus className="h-4 w-4" /> Add Partner</Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? <div className="p-8 text-sm text-slate-500">Loading…</div>
        : items.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="h-8 w-8 mx-auto text-slate-400" />
            <p className="mt-3 text-slate-600 text-sm">No partners yet.</p>
            <Button className="mt-4" onClick={openNew} data-testid="empty-new-partner-btn">Add partner</Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50" data-testid={`partner-row-${p.id}`}>
                  <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{p.code || "—"}</td>
                  <td className="px-6 py-4 text-slate-600">{p.contact_person || "—"}</td>
                  <td className="px-6 py-4 text-slate-600">{p.phone || "—"}</td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)} data-testid={`edit-partner-${p.id}`}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p)} className="text-red-600 hover:text-red-700" data-testid={`delete-partner-${p.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" data-testid="partner-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit partner" : "Add courier partner"}</DialogTitle>
            <DialogDescription>Courier company used on invoice line items (docket-level partner).</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Partner name *"><Input required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} data-testid="partner-name" /></F>
            <F label="Code"><Input value={form.code} onChange={(e)=>setForm({...form,code:e.target.value})} data-testid="partner-code" /></F>
            <F label="Contact person"><Input value={form.contact_person} onChange={(e)=>setForm({...form,contact_person:e.target.value})} data-testid="partner-contact" /></F>
            <F label="Phone"><Input value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} data-testid="partner-phone" /></F>
            <F label="Email" full><Input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} data-testid="partner-email" /></F>
            <F label="Address" full><Textarea rows={2} value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})} data-testid="partner-address" /></F>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} data-testid="partner-save-btn">{saving ? "Saving…" : "Save partner"}</Button>
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
