
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Car,
  MapPin,
  UserCheck,
  Settings,
  Wrench,
  ClipboardList,
  Route,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Usuarios", url: "/usuarios", icon: Users },
  { title: "Contratos", url: "/contratos", icon: FileText },
  { title: "Vehículos", url: "/vehiculos", icon: Car },
  { title: "Rutas", url: "/rutas", icon: MapPin },
  { title: "Viajes", url: "/viajes", icon: Route },
  { title: "Choferes", url: "/choferes", icon: UserCheck },
  { title: "Repuestos", url: "/repuestos", icon: Settings },
  { title: "Solicitudes", url: "/solicitudes-repuestos", icon: ClipboardList },
  { title: "Mantenimiento", url: "/mantenimiento", icon: Wrench },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/" && currentPath === "/") return true;
    if (path !== "/" && currentPath.startsWith(path)) return true;
    return false;
  };

  const getNavClasses = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
      active
        ? "bg-primary text-white font-medium shadow-md"
        : "text-primary-900 hover:bg-primary-50 hover:text-primary"
    }`;

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-64"} border-r border-secondary-medium bg-white transition-all duration-300`}
      collapsible="icon"
    >
      <div className="p-4 border-b border-secondary-medium">
        <div className="flex items-center gap-3">
          {/* Monograma SM con los colores del logo */}
          <div className="w-9 h-9 rounded-lg bg-[#1d6b2d] flex items-center justify-center shrink-0 select-none">
            <span className="text-white font-black text-sm leading-none tracking-tight">
              S<span className="text-[#8dc63f]">M</span>
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-black text-sm leading-tight tracking-wide">
                <span className="text-[#1d6b2d]">SERVI-</span>
                <span className="text-[#808080]">MONT</span>
              </h2>
              <p className="text-[10px] font-semibold text-[#8dc63f] leading-tight">M2D C.A.</p>
              <p className="text-[9px] text-secondary-dark leading-tight">Sistema de Gestión</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className={`${collapsed ? "hidden" : "text-secondary-dark text-sm font-medium mb-2"}`}>
            Navegación
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="p-0">
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={getNavClasses(isActive(item.url))}
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon className={`w-5 h-5 ${collapsed ? "mx-auto" : ""}`} />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="p-3 border-t border-secondary-medium">
        <SidebarTrigger className="w-full flex items-center justify-center p-2 rounded-lg bg-secondary-light hover:bg-secondary-medium transition-colors" />
      </div>
    </Sidebar>
  );
}
