import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setToken(sp.get("token") || ""); }, [sp]);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success("Password reset. Please sign in.");
      navigate("/login");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Reset failed");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" data-testid="reset-page">
      <Card className="w-full max-w-md p-8">
        <Link to="/login" className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-3 w-3 mr-1" /> Back to sign in
        </Link>
        <h2 className="mt-4 font-heading text-3xl tracking-tight font-semibold">Set a new password</h2>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">Reset token</Label>
            <Input className="mt-1.5 h-11 font-mono text-xs" value={token} onChange={(e)=>setToken(e.target.value)} data-testid="reset-token-input" required />
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">New password</Label>
            <Input className="mt-1.5 h-11" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} data-testid="reset-new-password" required />
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">Confirm password</Label>
            <Input className="mt-1.5 h-11" type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} data-testid="reset-confirm-password" required />
          </div>
          <Button type="submit" disabled={submitting} className="w-full h-11 bg-blue-700 hover:bg-blue-800" data-testid="reset-submit">
            {submitting ? "Resetting…" : "Reset password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
