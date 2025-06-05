
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vehiculos" element={<Vehicles />} />
            {/* Próximas rutas */}
            <Route path="/usuarios" element={<div className="p-8 text-center text-secondary-dark">Módulo de Usuarios - En desarrollo</div>} />
            <Route path="/contratos" element={<div className="p-8 text-center text-secondary-dark">Módulo de Contratos - En desarrollo</div>} />
            <Route path="/rutas" element={<div className="p-8 text-center text-secondary-dark">Módulo de Rutas - En desarrollo</div>} />
            <Route path="/choferes" element={<div className="p-8 text-center text-secondary-dark">Módulo de Choferes - En desarrollo</div>} />
            <Route path="/repuestos" element={<div className="p-8 text-center text-secondary-dark">Módulo de Repuestos - En desarrollo</div>} />
            <Route path="/mantenimiento" element={<div className="p-8 text-center text-secondary-dark">Módulo de Mantenimiento - En desarrollo</div>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
