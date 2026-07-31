import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, KeyRound, UserCircle2, Menu } from "lucide-react";

export const TopBar = ({ onMobileToggle }) => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.new_password !== pw.confirm) return toast.error("New passwords do not match");
    if (pw.new_password.length < 8) return toast.error("Password must be at least 8 characters");
    setSaving(true);
    try {
      await authApi.changePassword(pw.current_password, pw.new_password);
      toast.success("Password updated successfully.");
      setOpen(false);
      setPw({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not change password");
    } finally { setSaving(false); }
  };

  const initials = (user?.name || user?.email || "A").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <header
        data-testid="app-topbar"
        className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur border-b border-slate-200/70 flex items-center gap-3 px-4 md:px-6"
      >
        {onMobileToggle && (
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMobileToggle} data-testid="topbar-mobile-toggle">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end leading-none">
            <span className="text-xs text-slate-500">Signed in as</span>
            <span className="text-sm font-medium text-slate-900">{user?.email}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="topbar-user-menu"
                className="h-9 w-9 rounded-full bg-blue-700 text-white text-xs font-semibold flex items-center justify-center hover:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                aria-label="User menu"
              >
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <UserCircle2 className="h-4 w-4 text-slate-500" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{user?.name || "Admin"}</div>
                  <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setOpen(true)} data-testid="change-password-item">
                <KeyRound className="h-4 w-4" /> Change password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logout} className="text-red-600 focus:text-red-700 focus:bg-red-50" data-testid="logout-item">
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" data-testid="change-password-dialog">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one (min 8 characters).</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Current password">
              <Input type="password" value={pw.current_password} onChange={(e)=>setPw({...pw, current_password:e.target.value})} required data-testid="pw-current" />
            </Field>
            <Field label="New password">
              <Input type="password" value={pw.new_password} onChange={(e)=>setPw({...pw, new_password:e.target.value})} required data-testid="pw-new" />
            </Field>
            <Field label="Confirm new password">
              <Input type="password" value={pw.confirm} onChange={(e)=>setPw({...pw, confirm:e.target.value})} required data-testid="pw-confirm" />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-blue-700 hover:bg-blue-800" data-testid="pw-save-btn">
                {saving ? "Saving…" : "Update password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Field = ({ label, children }) => (
  <div>
    <Label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">{label}</Label>
    <div className="mt-1.5">{children}</div>
  </div>
);
