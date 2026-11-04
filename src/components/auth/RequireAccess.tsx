import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { AppModule, getRoleLabel, MODULE_LABELS } from "@/lib/permissions";

interface RequireAccessProps {
  module: AppModule;
  children: ReactNode;
}

/**
 * Muestra el modulo solo si el rol de la sesion puede leerlo en el backend.
 * Asi una URL escrita a mano no termina en una pantalla llena de errores 403.
 */
export function RequireAccess({ module, children }: RequireAccessProps) {
  const { can } = useAuth();

  if (!can(module)) {
    return <AccessDenied module={module} />;
  }

  return <>{children}</>;
}

export function AccessDenied({ module }: { module: AppModule }) {
  const { role } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[50vh] items-center justify-center animate-fade-in">
      <Card className="w-full max-w-md border-secondary-medium">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-primary-900">Acceso restringido</h2>
            <p className="text-sm text-secondary-dark">
              Tu rol <strong>{getRoleLabel(role)}</strong> no tiene acceso al módulo{" "}
              <strong>{MODULE_LABELS[module]}</strong>. Si lo necesitas, solicítalo a un gerente.
            </p>
          </div>
          <Button onClick={() => navigate("/")}>Ir al inicio</Button>
        </CardContent>
      </Card>
    </div>
  );
}
