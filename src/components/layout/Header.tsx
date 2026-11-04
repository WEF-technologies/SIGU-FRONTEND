
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleLabel } from "@/lib/permissions";
import { LogOut, User } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();

  const getDisplayName = () => {
    if (user?.name && user?.lastname) {
      return `${user.name} ${user.lastname}`;
    }
    return user?.name || user?.email || 'Usuario';
  };

  return (
    <header className="sticky top-0 z-40 border-b border-secondary-medium bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-14 items-center justify-between px-4">
        <SidebarTrigger className="h-8 w-8" />
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <User className="w-4 h-4" />
            <span>Bienvenido, {getDisplayName()}</span>
            {user?.role && (
              <Badge variant="outline" className="border-primary/30 text-primary" title="Rol de la sesión">
                {getRoleLabel(user.role)}
              </Badge>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </header>
  );
}
