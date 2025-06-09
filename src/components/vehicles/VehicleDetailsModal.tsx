import { useState } from "react";
import { Vehicle, Maintenance, SparePart } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Plus, Calendar, Gauge, MapPin, Wrench, Package } from "lucide-react";
import { MaintenanceForm } from "@/components/maintenance/MaintenanceForm";

interface VehicleDetailsModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateKilometers: (vehicleId: string, kilometers: number) => void;
}

export function VehicleDetailsModal({ vehicle, isOpen, onClose, onUpdateKilometers }: VehicleDetailsModalProps) {
  const [editingKm, setEditingKm] = useState(false);
  const [kmValue, setKmValue] = useState("");
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceHistory, setMaintenanceHistory] = useState<Maintenance[]>([
    {
      id: "1",
      vehicle_id: vehicle?.id || "",
      type: "M3",
      description: "Mantenimiento mayor completo",
      date: "2024-01-15",
      kilometers: 45000,
      created_at: "2024-01-15",
      updated_at: "2024-01-15"
    },
    {
      id: "2",
      vehicle_id: vehicle?.id || "",
      type: "M1",
      description: "Cambio de aceite y filtros",
      date: "2024-05-20",
      kilometers: 50000,
      created_at: "2024-05-20",
      updated_at: "2024-05-20"
    }
  ]);

  if (!vehicle) return null;

  const spareParts: SparePart[] = [
    {
      id: "1",
      vehicle_id: vehicle.id,
      description: "Filtro de aceite",
      quantity: 2,
      company_location: "Almacén Central",
      store_location: "AutoPartes Express",
      created_at: "2024-01-15",
      updated_at: "2024-01-15"
    }
  ];

  const maintenanceTypeConfig = {
    M1: { label: "M1 - Preventivo", color: "bg-blue-100 text-blue-800" },
    M2: { label: "M2 - Correctivo", color: "bg-yellow-100 text-yellow-800" },
    M3: { label: "M3 - Mayor", color: "bg-red-100 text-red-800" },
    M4: { label: "M4 - Especializado", color: "bg-purple-100 text-purple-800" }
  };

  const getStatusBadge = (status: Vehicle['status']) => {
    const statusConfig = {
      available: { text: 'Operativa', className: 'bg-green-100 text-green-800' },
      maintenance: { text: 'En Mantenimiento', className: 'bg-yellow-100 text-yellow-800' },
      out_of_service: { text: 'Inactiva', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status];
    return <Badge className={config.className}>{config.text}</Badge>;
  };

  const calculateM3Progress = () => {
    const currentKm = vehicle.current_kilometers || 0;
    const lastM3Km = vehicle.last_m3_km || 0;
    const nextM3Km = vehicle.next_m3_km || (lastM3Km + 10000);
    const kmSinceLastM3 = currentKm - lastM3Km;
    const kmBetweenM3 = nextM3Km - lastM3Km;
    return Math.min((kmSinceLastM3 / kmBetweenM3) * 100, 100);
  };

  const handleSaveKilometers = () => {
    const km = parseInt(kmValue);
    if (!isNaN(km) && km > 0) {
      onUpdateKilometers(vehicle.id, km);
      setEditingKm(false);
      setKmValue("");
    }
  };

  const handleMaintenanceAdded = (newMaintenance: Maintenance) => {
    setMaintenanceHistory(prev => [newMaintenance, ...prev]);
    setShowMaintenanceForm(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Detalles del Vehículo - {vehicle.plate_number}</span>
            {getStatusBadge(vehicle.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <Card className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Marca</Label>
                <p className="font-medium">{vehicle.brand}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Modelo</Label>
                <p className="font-medium">{vehicle.model}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Año</Label>
                <p className="font-medium">{vehicle.year}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Placa</Label>
                <p className="font-medium">{vehicle.plate_number}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600 flex items-center gap-1">
                  <Gauge className="w-4 h-4" />
                  Kilometraje Actual
                </Label>
                {editingKm ? (
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      value={kmValue}
                      onChange={(e) => setKmValue(e.target.value)}
                      placeholder={vehicle.current_kilometers?.toString() || "0"}
                      className="w-24"
                    />
                    <Button size="sm" onClick={handleSaveKilometers}>
                      Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingKm(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{vehicle.current_kilometers?.toLocaleString() || 'No registrado'} km</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingKm(true);
                        setKmValue(vehicle.current_kilometers?.toString() || "");
                      }}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Ubicación
                </Label>
                <p className="font-medium">{vehicle.location || 'No especificada'}</p>
              </div>
            </div>
          </Card>

          {/* Progreso M3 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="font-medium flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Próximo Mantenimiento M3
              </Label>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Último M3: {vehicle.last_m3_date || 'No registrado'}</span>
                <span>Faltan: {vehicle.next_m3_km ? (vehicle.next_m3_km - (vehicle.current_kilometers || 0)).toLocaleString() : 'N/A'} km</span>
              </div>
              <Progress value={calculateM3Progress()} className="h-2" />
            </div>
          </Card>

          {/* Tabs para historial y repuestos */}
          <Tabs defaultValue="maintenance" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="maintenance">Historial de Mantenimientos</TabsTrigger>
              <TabsTrigger value="parts">Repuestos</TabsTrigger>
            </TabsList>

            <TabsContent value="maintenance" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Historial de Mantenimientos</h3>
                <Button 
                  size="sm" 
                  className="bg-primary"
                  onClick={() => setShowMaintenanceForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Mantenimiento
                </Button>
              </div>

              {showMaintenanceForm ? (
                <Card className="p-4">
                  <MaintenanceForm
                    vehicleId={vehicle.id}
                    vehiclePlate={vehicle.plate_number}
                    onMaintenanceAdded={handleMaintenanceAdded}
                    onCancel={() => setShowMaintenanceForm(false)}
                  />
                </Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Kilometraje</TableHead>
                        <TableHead>Descripción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {maintenanceHistory.map((maintenance) => (
                        <TableRow key={maintenance.id}>
                          <TableCell>
                            <Badge 
                              className={maintenanceTypeConfig[maintenance.type]?.color}
                              variant="outline"
                            >
                              {maintenance.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{maintenance.date}</TableCell>
                          <TableCell>{maintenance.kilometers?.toLocaleString()} km</TableCell>
                          <TableCell>{maintenance.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="parts" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Repuestos Asociados</h3>
                <Button size="sm" className="bg-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Repuesto
                </Button>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Ubicación Empresa</TableHead>
                      <TableHead>Tienda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spareParts.map((part) => (
                      <TableRow key={part.id}>
                        <TableCell>{part.description}</TableCell>
                        <TableCell>{part.quantity}</TableCell>
                        <TableCell>{part.company_location}</TableCell>
                        <TableCell>{part.store_location}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
