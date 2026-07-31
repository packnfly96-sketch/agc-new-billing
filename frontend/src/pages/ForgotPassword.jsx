import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Copy } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setSent(true);
      if (res.reset_token) setToken(res.reset_token);
      toast.success("Reset link generated.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not process request");
    } finally { setSubmitting(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(token);
    toast.success("Reset token copied");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" data-testid="forgot-page">
      <Card className="w-full max-w-md p-8">
        <Link to="/login" className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-3 w-3 mr-1" /> Back to sign in
        </Link>
        <h2 className="mt-4 font-heading text-3xl tracking-tight font-semibold">Reset your password</h2>
        <p className="mt-2 text-sm text-slate-500">
          Enter the admin email to generate a reset token.
        </p>
        {!sent ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">Email</Label>
              <Input
                data-testid="forgot-email"
                type="email"
                className="mt-1.5 h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-blue-700 hover:bg-blue-800 text-white"
              data-testid="forgot-submit"
            >
              {submitting ? "Working…" : "Generate reset token"}
            </Button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <div className="text-xs font-semibold tracking-[0.15em] uppercase text-blue-700">Reset token</div>
              {token ? (
                <>
                  <div className="mt-2 font-mono text-xs break-all bg-white border border-blue-200 rounded p-2" data-testid="reset-token">
                    {token}
                  </div>
                  <Button size="sm" variant="outline" className="mt-2" onClick={copy} data-testid="copy-token">
                    <Copy className="h-3 w-3" /> Copy token
                  </Button>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-700">If that email is registered, a reset link has been generated.</p>
              )}
            </div>
            <Button asChild className="w-full h-11 bg-blue-700 hover:bg-blue-800" data-testid="go-reset">
              <Link to={`/reset-password${token ? `?token=${encodeURIComponent(token)}` : ""}`}>
                Continue to reset
              </Link>
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
