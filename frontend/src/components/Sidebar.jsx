import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { assetUrl } from "@/lib/api";
import {
  LayoutDashboard, FileText, Users, Truck, BarChart3, Settings, ChevronLeft, ChevronRight, Package,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard", end: true },
  { to: "/invoices", label: "Invoices", icon: FileText, testId: "nav-invoices" },
  { to: "/customers", label: "Customers", icon: Users, testId: "nav-customers" },
  { to: "/partners", label: "Courier Partners", icon: Truck, testId: "nav-partners" },
  { to: "/reports", label: "Reports", icon: BarChart3, testId: "nav-reports" },
  { to: "/settings/company", label: "Settings", icon: Settings, testId: "nav-settings" },
];

export const Sidebar = ({ collapsed, onToggle }) => {
  const { company } = useCompany();
  const logo = assetUrl(company, "logo");

  return (
    <aside
      data-testid="app-sidebar"
      className={`hidden md:flex fixed inset-y-0 left-0 z-30 flex-col bg-slate-950 text-slate-100 border-r border-slate-800 transition-[width] duration-200 ease-out ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand */}
      <div className={`flex items-center gap-3 h-16 border-b border-slate-800 ${collapsed ? "justify-center px-2" : "px-5"}`}>
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm shadow-blue-900/40">
          {logo ? (
            <img src={logo} alt="logo" className="h-6 w-6 object-contain rounded" />
          ) : (
            <Package className="h-4 w-4 text-white" />
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-heading text-sm font-semibold tracking-tight leading-none truncate">
              {company?.name?.trim() || "SD ENTERPRISES"}
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-300/80">
              Billing Suite
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, testId, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-testid={testId}
            className={({ isActive }) =>
              `group relative flex items-center ${collapsed ? "justify-center px-2" : "px-4"} mx-2 h-10 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-blue-600/15 text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-blue-500 before:rounded-r"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-3 truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        data-testid="sidebar-toggle"
        className="h-11 border-t border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
};
