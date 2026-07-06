import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const Users = lazy(() => import("./pages/Users"));
const Contracts = lazy(() => import("./pages/Contracts"));
const RoutesPage = lazy(() => import("./pages/Routes"));
const Drivers = lazy(() => import("./pages/Drivers"));
const SpareParts = lazy(() => import("./pages/SpareParts"));
const SparePartRequests = lazy(() => import("./pages/SparePartRequests"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const FuelPage = lazy(() => import("./pages/Fuel"));
const Trips = lazy(() => import("./pages/Trips"));
const Tools = lazy(() => import("./pages/Tools"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteLoader = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      <p className="mt-2 text-sm text-gray-600">Cargando módulo...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <ProtectedRoute>
            <MainLayout>
              <Suspense fallback={<RouteLoader />}>
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
                  <Route path="/combustible" element={<FuelPage />} />
                  <Route path="/herramientas" element={<Tools />} />
                  <Route path="/viajes" element={<Trips />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </MainLayout>
          </ProtectedRoute>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
