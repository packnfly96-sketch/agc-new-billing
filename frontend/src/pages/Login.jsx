import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Package, Lock, Mail, Loader2 } from "lucide-react";

const formatDetail = (d) => {
  if (!d) return "Something went wrong. Please try again.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(" ");
  if (d?.msg) return d.msg;
  return String(d);
};

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(location.state?.from || "/", { replace: true });
    }
  }, [user, navigate, location.state]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success("Signed in.");
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      toast.error(formatDetail(err?.response?.data?.detail) || err.message || "Login failed");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5 bg-slate-50" data-testid="login-page">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:col-span-3 relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white p-14 flex-col justify-between">
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur">
            <Package className="h-5 w-5" />
          </div>
          <div className="font-heading text-xl font-semibold tracking-tight">SD ENTERPRISES</div>
        </div>
        <div className="relative z-10 max-w-lg">
          <div className="text-xs font-semibold tracking-[0.2em] uppercase text-blue-300">Courier Billing Suite</div>
          <h1 className="mt-4 font-heading text-4xl lg:text-5xl tracking-tight leading-[1.05] font-semibold">
            Every consignment,<br />billed with precision.
          </h1>
          <p className="mt-4 text-blue-100/80 text-base leading-relaxed">
            GST-ready invoices, monthly Excel exports, and a single source of truth for customers,
            partners and payments.
          </p>
        </div>
        <div className="relative z-10 text-xs text-blue-200/70">
          © {new Date().getFullYear()} SD Enterprises · Internal use only
        </div>
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      {/* Right form */}
      <div className="lg:col-span-2 flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md p-8 shadow-lg border-slate-200/70">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
            <div className="font-heading text-lg font-semibold tracking-tight">SD ENTERPRISES</div>
          </div>
          <div className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-500">Sign in</div>
          <h2 className="mt-1 font-heading text-3xl tracking-tight font-semibold text-slate-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-slate-500">Use your admin credentials to access the console.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">Email</Label>
              <div className="mt-1.5 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  data-testid="login-email"
                  type="email"
                  className="pl-9 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="admin@example.com"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">Password</Label>
                <Link to="/forgot-password" className="text-xs font-medium text-blue-700 hover:text-blue-900" data-testid="forgot-link">
                  Forgot?
                </Link>
              </div>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  data-testid="login-password"
                  type="password"
                  className="pl-9 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white active:scale-[0.99] transition-transform"
              data-testid="login-submit"
            >
              {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>) : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
