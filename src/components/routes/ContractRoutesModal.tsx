import { Route, Contract } from "@/types";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { RouteActions } from "@/components/routes/RouteActions";

interface Props {
  contract: Contract | null;
  routes: Route[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (route: Route) => void;
  onDelete: (route: Route) => void;
  onAdd: (contractId: string) => void;
}

export default function ContractRoutesModal({ contract, routes, isOpen, onClose, onEdit, onDelete, onAdd }: Props) {
  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={contract ? `Rutas - ${contract.description}` : "Rutas"}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">{routes.length} ruta(s)</div>
        <div>
          <Button size="sm" onClick={() => contract && onAdd(contract.id)} className="bg-primary text-white">Agregar Ruta</Button>
        </div>
      </div>

      <div className="space-y-3">
        {routes.length === 0 && <p className="text-sm text-gray-600">No hay rutas para este contrato.</p>}
        {routes.map((route) => (
          <div key={(route as any).id || (route as any).route_id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <div className="font-medium">{route.description}</div>
              <div className="text-sm text-gray-600">{route.from_location} → {route.to_location}</div>
              <div className="text-sm text-gray-500">{route.kilometers ? `${route.kilometers} km` : '-'}</div>
            </div>
            <div>
              <RouteActions route={route} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </div>
        ))}
      </div>
    </FormModal>
  );
}
