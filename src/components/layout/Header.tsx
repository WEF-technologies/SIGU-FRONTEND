
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
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
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <SidebarTrigger className="h-8 w-8 shrink-0" />

        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">Bienvenido, </span>
              {getDisplayName()}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="flex shrink-0 items-center gap-2"
            aria-label="Cerrar Sesión"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
