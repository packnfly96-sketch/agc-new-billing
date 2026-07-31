import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/Layout";
import { CompanyProvider } from "@/context/CompanyContext";
import Dashboard from "@/pages/Dashboard";
import InvoicesList from "@/pages/InvoicesList";
import InvoiceForm from "@/pages/InvoiceForm";
import InvoiceDetail from "@/pages/InvoiceDetail";
import Customers from "@/pages/Customers";
import CourierPartners from "@/pages/CourierPartners";
import Reports from "@/pages/Reports";
import CompanySettings from "@/pages/CompanySettings";

function App() {
  return (
    <CompanyProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<InvoicesList />} />
            <Route path="/invoices/new" element={<InvoiceForm />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/partners" element={<CourierPartners />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings/company" element={<CompanySettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </CompanyProvider>
  );
}

export default App;
