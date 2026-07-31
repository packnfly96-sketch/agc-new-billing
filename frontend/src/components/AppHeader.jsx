import { NavLink } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { LayoutDashboard, FileText, Users, Truck, BarChart3, Settings } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard", end: true },
  { to: "/invoices", label: "Invoices", icon: FileText, testId: "nav-invoices" },
  { to: "/customers", label: "Customers", icon: Users, testId: "nav-customers" },
  { to: "/partners", label: "Courier Partners", icon: Truck, testId: "nav-partners" },
  { to: "/reports", label: "Reports", icon: BarChart3, testId: "nav-reports" },
  { to: "/settings/company", label: "Settings", icon: Settings, testId: "nav-settings" },
];

export const AppHeader = () => {
  return (
    <header data-testid="app-header" className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto flex items-center gap-6 px-6 py-3">
        <NavLink to="/" className="flex items-center gap-3 shrink-0" data-testid="app-header-brand">
          <BrandMark maxHeight={36} nameClassName="text-lg text-slate-900" testId="header-brand" />
        </NavLink>
        <nav className="flex items-center gap-1 overflow-x-auto ml-auto">
          {navItems.map(({ to, label, icon: Icon, testId, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={testId}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
};
