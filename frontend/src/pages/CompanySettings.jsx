import { useEffect, useState } from "react";
import { companyApi } from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { AssetUpload } from "@/components/AssetUpload";
import { toast } from "sonner";

const emptyForm = {
  name: "", address: "", city: "", state: "", state_code: "", pincode: "",
  phone: "", email: "", gstin: "", pan: "", website: "",
  bank_name: "", bank_account: "", bank_ifsc: "", bank_branch: "",
  invoice_prefix: "SDE", default_terms: "", default_tax_rate: 18,
};

export default function CompanySettings() {
  const { company, refresh } = useCompany();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) setForm({ ...emptyForm, ...company });
  }, [company]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, default_tax_rate: Number(form.default_tax_rate) || 0 };
      await companyApi.update(payload);
      toast.success("Company profile saved successfully.");
      await refresh();
    } catch {
      toast.error("Could not save profile.");
    } finally { setSaving(false); }
  };

  return (
    <div data-testid="company-settings-page" className="space-y-8">
      <div>
        <div className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-500">Settings</div>
        <h1 className="mt-2 font-heading text-4xl sm:text-5xl tracking-tight leading-none font-semibold text-slate-900">
          My Company
        </h1>
        <p className="mt-3 text-slate-500 text-sm sm:text-base max-w-2xl">
          Single company profile used across the app — header, invoice preview, print and PDF.
          Logo, signature and stamp automatically appear on every invoice.
        </p>
      </div>

      {/* Assets */}
      <Card className="p-6" data-testid="assets-card">
        <h2 className="font-heading text-xl font-medium tracking-tight mb-6">Brand assets</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AssetUpload
            assetType="logo"
            title="Company Logo"
            testIdPrefix="logo"
            help="Appears in the app header and top of every invoice."
          />
          <AssetUpload
            assetType="signature"
            title="Signature"
            testIdPrefix="signature"
            help="Placed in the authorised signatory area on invoices."
          />
          <AssetUpload
            assetType="stamp"
            title="Company Stamp"
            testIdPrefix="stamp"
            help="Optional. Rendered next to the signature on invoices."
          />
        </div>
      </Card>

      {/* Profile form */}
      <form onSubmit={save}>
        <Card className="p-6 space-y-6" data-testid="profile-card">
          <h2 className="font-heading text-xl font-medium tracking-tight">Business details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="Legal / Trade name" full>
              <Input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="SD ENTERPRISES" data-testid="company-name-input" />
            </F>
            <F label="Email"><Input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} data-testid="company-email-input" /></F>
            <F label="Phone"><Input value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} data-testid="company-phone-input" /></F>
            <F label="Website" full><Input value={form.website} onChange={(e)=>setForm({...form,website:e.target.value})} data-testid="company-website-input" /></F>
            <F label="Address" full><Textarea rows={2} value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})} data-testid="company-address-input" /></F>
            <F label="City"><Input value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})} data-testid="company-city" /></F>
            <F label="State"><Input value={form.state} onChange={(e)=>setForm({...form,state:e.target.value})} data-testid="company-state" /></F>
            <F label="State Code"><Input value={form.state_code} onChange={(e)=>setForm({...form,state_code:e.target.value})} data-testid="company-state-code" /></F>
            <F label="Pincode"><Input value={form.pincode} onChange={(e)=>setForm({...form,pincode:e.target.value})} data-testid="company-pincode" /></F>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500 mb-2">Tax details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label="GSTIN"><Input value={form.gstin} onChange={(e)=>setForm({...form,gstin:e.target.value.toUpperCase()})} data-testid="company-gstin" /></F>
              <F label="PAN"><Input value={form.pan} onChange={(e)=>setForm({...form,pan:e.target.value.toUpperCase()})} data-testid="company-pan" /></F>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500 mb-2">Bank details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label="Bank name"><Input value={form.bank_name} onChange={(e)=>setForm({...form,bank_name:e.target.value})} data-testid="company-bank-name" /></F>
              <F label="Account number"><Input value={form.bank_account} onChange={(e)=>setForm({...form,bank_account:e.target.value})} data-testid="company-bank-account" /></F>
              <F label="IFSC"><Input value={form.bank_ifsc} onChange={(e)=>setForm({...form,bank_ifsc:e.target.value.toUpperCase()})} data-testid="company-bank-ifsc" /></F>
              <F label="Branch"><Input value={form.bank_branch} onChange={(e)=>setForm({...form,bank_branch:e.target.value})} data-testid="company-bank-branch" /></F>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500 mb-2">Invoice defaults</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <F label="Prefix"><Input value={form.invoice_prefix} onChange={(e)=>setForm({...form,invoice_prefix:e.target.value.toUpperCase()})} data-testid="company-invoice-prefix" /></F>
              <F label="Default tax rate (%)"><Input type="number" step="0.01" value={form.default_tax_rate} onChange={(e)=>setForm({...form,default_tax_rate:e.target.value})} data-testid="company-default-tax" /></F>
            </div>
            <div className="mt-4">
              <F label="Default Terms & Conditions"><Textarea rows={3} value={form.default_terms} onChange={(e)=>setForm({...form,default_terms:e.target.value})} data-testid="company-default-terms" /></F>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={saving} data-testid="save-company-btn">
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

const F = ({ label, children, full }) => (
  <div className={full ? "sm:col-span-2" : ""}>
    <Label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">{label}</Label>
    <div className="mt-1.5">{children}</div>
  </div>
);
