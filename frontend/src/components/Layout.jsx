import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";

export const Layout = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900 font-body">
    <AppHeader />
    <main className="max-w-7xl mx-auto px-6 py-10">
      <Outlet />
    </main>
  </div>
);
