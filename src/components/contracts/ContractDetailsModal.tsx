
import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Contract } from "@/types";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface ContractDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
}

export function ContractDetailsModal({ isOpen, onClose, contract }: ContractDetailsModalProps) {
  if (!contract) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary-900">
            Detalles del Contrato
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-primary-900 mb-2">Información General</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Código:</span> {contract.contract_code || 'No asignado'}</p>
                <p><span className="font-medium">Descripción:</span> {contract.description}</p>
                <p><span className="font-medium">Ubicación:</span> {contract.location}</p>
                <p><span className="font-medium">Estado:</span> <StatusBadge status={contract.status} /></p>
                <p><span className="font-medium">Fecha Inicio:</span> {new Date(contract.start_date).toLocaleDateString()}</p>
                <p><span className="font-medium">Fecha Fin:</span> {new Date(contract.end_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-primary-900 mb-2">Vehículos Asignados</h3>
              <div className="space-y-1">
                {contract.vehicles && contract.vehicles.length > 0 ? (
                  contract.vehicles.map((vehicle) => (
                    <Badge key={vehicle.id} variant="outline" className="mr-2 mb-1">
                      {vehicle.plate_number} - {vehicle.brand} {vehicle.model}
                    </Badge>
                  ))
                ) : (
                  <p className="text-gray-500">No hay vehículos asignados</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-primary-900 mb-2">Usuarios Asignados</h3>
              <div className="space-y-1">
                {contract.users && contract.users.length > 0 ? (
                  contract.users.map((user) => (
                    <Badge key={user.id} variant="outline" className="mr-2 mb-1">
                      {user.name} {user.last_name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-gray-500">No hay usuarios asignados</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-primary-900 mb-2">Rutas</h3>
              <div className="space-y-2">
                {contract.routes && contract.routes.length > 0 ? (
                  contract.routes.map((route) => (
                    <div key={route.id} className="border rounded p-2">
                      <p className="font-medium">{route.description}</p>
                      <p className="text-sm text-gray-600">{route.from_location} → {route.to_location}</p>
                      <StatusBadge status={route.status || 'pending'} />
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No hay rutas asignadas</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-primary-900 mb-2">Turnos</h3>
              <div className="space-y-2">
                {contract.shifts && contract.shifts.length > 0 ? (
                  contract.shifts.map((shift) => (
                    <div key={shift.id} className="border rounded p-2">
                      <p className="font-medium">{shift.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No hay turnos asignados</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
