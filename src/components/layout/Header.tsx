
import { Bell, Search, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="h-16 border-b border-secondary-medium bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="lg:hidden" />
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-dark w-4 h-4" />
          <Input
            placeholder="Buscar..."
            className="pl-10 w-64 bg-secondary-light border-secondary-medium focus:border-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5 text-secondary-dark" />
          <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 bg-red-500 text-white text-xs flex items-center justify-center">
            3
          </Badge>
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block text-sm">
            <p className="font-medium text-primary-900">Admin User</p>
            <p className="text-xs text-secondary-dark">Administrador</p>
          </div>
        </div>
      </div>
    </header>
  );
}
