
import { useState, useEffect } from "react";
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
import { MaintenanceFormModal } from "@/components/maintenance/MaintenanceFormModal";
import { useMaintenance } from "@/hooks/useMaintenance";
import { maintenanceTypeConfig } from "@/constants/maintenanceTypes";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

const API_URL = import.meta.env.VITE_API_URL || "https://sigu-back-e39xv5vbt-enmanuelalxs-projects.vercel.app";

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
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const { maintenance, vehicles, createMaintenance } = useMaintenance();
  const authenticatedFetch = useAuthenticatedFetch();

  // Filtrar mantenimientos para este vehículo específico
  const vehicleMaintenances = maintenance.filter(m => m.vehicle_plate === vehicle?.plate_number);

  useEffect(() => {
    if (vehicle) {
      const currentKm = vehicle.current_kilometers || vehicle.kilometers || 0;
      setKmValue(currentKm.toString());
      // Cargar repuestos para este vehículo
      fetchVehicleSpareParts(vehicle.plate_number);
    }
  }, [vehicle]);

  const fetchVehicleSpareParts = async (plateNumber: string) => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/v1/spare_parts/vehicle/${plateNumber}`);
      if (response.ok) {
        const data = await response.json();
        setSpareParts(Array.isArray(data) ? data : []);
      } else {
        setSpareParts([]);
      }
    } catch (error) {
      console.error('Error fetching spare parts:', error);
      setSpareParts([]);
    }
  };

  if (!vehicle) return null;

  const getStatusBadge = (status: Vehicle['status']) => {
    const statusConfig = {
      available: { text: 'Operativa', className: 'bg-green-100 text-green-800' },
      maintenance: { text: 'En Mantenimiento', className: 'bg-yellow-100 text-yellow-800' },
      out_of_service: { text: 'Inactiva', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status] || { text: status, className: 'bg-blue-100 text-blue-800' };
    return <Badge className={config.className}>{config.text}</Badge>;
  };

  // Calcular información M3 usando los datos del vehículo
  const calculateM3Progress = () => {
    const currentKm = vehicle.current_kilometers || vehicle.kilometers || 0;
    const nextM3Km = vehicle.next_m3_kilometers;
    
    if (!currentKm || !nextM3Km) {
      return 0;
    }
    
    // Asumimos un intervalo M3 de 7000km para el cálculo de progreso
    const M3_INTERVAL = 7000;
    const lastM3Km = nextM3Km - M3_INTERVAL;
    const kmSinceLastM3 = currentKm - lastM3Km;
    return Math.min((kmSinceLastM3 / M3_INTERVAL) * 100, 100);
  };

  const getM3Status = () => {
    const currentKm = vehicle.current_kilometers || vehicle.kilometers || 0;
    const nextM3Km = vehicle.next_m3_kilometers;
    
    if (!currentKm || !nextM3Km) {
      return { text: 'N/A', isOverdue: false };
    }
    
    const remaining = nextM3Km - currentKm;
    if (remaining <= 0) {
      return { text: 'Vencido', isOverdue: true };
    }
    
    return { text: `${remaining.toLocaleString()} km`, isOverdue: false };
  };

  const m3Status = getM3Status();

  const handleSaveKilometers = () => {
    const km = parseInt(kmValue);
    if (!isNaN(km) && km > 0) {
      onUpdateKilometers(vehicle.plate_number, km);
      setEditingKm(false);
    }
  };

  const handleMaintenanceSubmit = async (formData: any) => {
    const success = await createMaintenance(formData);
    if (success) {
      setShowMaintenanceForm(false);
    }
    return success;
  };

  return (
    <>
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
                        placeholder={(vehicle.current_kilometers || vehicle.kilometers || 0).toString()}
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
                      <p className="font-medium">{(vehicle.current_kilometers || vehicle.kilometers || 0).toLocaleString()} km</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingKm(true)}
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
                  <p className="font-medium">{vehicle.location || vehicle.status}</p>
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
                  <span>Último M3: {vehicle.last_m3_date ? new Date(vehicle.last_m3_date).toLocaleDateString() : 'No registrado'}</span>
                  <span className={m3Status.isOverdue ? 'text-red-600 font-medium' : ''}>
                    Faltan: {m3Status.text}
                  </span>
                </div>
                <Progress value={calculateM3Progress()} className="h-2" />
                <div className="text-xs text-gray-500">
                  Próximo M3 en: {vehicle.next_m3_kilometers?.toLocaleString() || 'N/A'} km
                </div>
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
                  <h3 className="font-medium">Historial de Mantenimientos ({vehicleMaintenances.length})</h3>
                  <Button 
                    size="sm" 
                    className="bg-primary"
                    onClick={() => setShowMaintenanceForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Mantenimiento
                  </Button>
                </div>

                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Kilometraje</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Realizado por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicleMaintenances.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No hay mantenimientos registrados para este vehículo
                          </TableCell>
                        </TableRow>
                      ) : (
                        vehicleMaintenances.map((maintenanceItem) => (
                          <TableRow key={maintenanceItem.id}>
                            <TableCell>
                              <Badge 
                                className={maintenanceTypeConfig[maintenanceItem.type]?.color}
                                variant="outline"
                              >
                                {maintenanceItem.type}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(maintenanceItem.date).toLocaleDateString()}</TableCell>
                            <TableCell>{maintenanceItem.kilometers?.toLocaleString()} km</TableCell>
                            <TableCell>{maintenanceItem.description}</TableCell>
                            <TableCell>{maintenanceItem.location || 'No especificada'}</TableCell>
                            <TableCell>{maintenanceItem.performed_by || 'No especificado'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              <TabsContent value="parts" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Repuestos Asociados ({spareParts.length})</h3>
                  <Button size="sm" className="bg-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Repuesto
                  </Button>
                </div>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Ubicación Empresa</TableHead>
                        <TableHead>Precio Unitario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {spareParts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No hay repuestos asociados a este vehículo
                          </TableCell>
                        </TableRow>
                      ) : (
                        spareParts.map((part) => (
                          <TableRow key={part.id}>
                            <TableCell>{part.code}</TableCell>
                            <TableCell>{part.description}</TableCell>
                            <TableCell>{part.quantity}</TableCell>
                            <TableCell>{part.company_location}</TableCell>
                            <TableCell>
                              {part.unit_price ? `$${part.unit_price.toLocaleString()}` : 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <MaintenanceFormModal
        isOpen={showMaintenanceForm}
        onClose={() => setShowMaintenanceForm(false)}
        editingMaintenance={null}
        vehicles={vehicles}
        onSubmit={handleMaintenanceSubmit}
      />
    </>
  );
}
