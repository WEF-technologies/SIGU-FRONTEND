
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Users from "./pages/Users";
import Contracts from "./pages/Contracts";
import RoutesPage from "./pages/Routes";
import Drivers from "./pages/Drivers";
import SpareParts from "./pages/SpareParts";
import SparePartRequests from "./pages/SparePartRequests";
import Maintenance from "./pages/Maintenance";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/vehiculos" element={<Vehicles />} />
                <Route path="/usuarios" element={<Users />} />
                <Route path="/contratos" element={<Contracts />} />
                <Route path="/rutas" element={<RoutesPage />} />
                <Route path="/choferes" element={<Drivers />} />
                <Route path="/repuestos" element={<SpareParts />} />
                <Route path="/solicitudes-repuestos" element={<SparePartRequests />} />
                <Route path="/mantenimiento" element={<Maintenance />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
