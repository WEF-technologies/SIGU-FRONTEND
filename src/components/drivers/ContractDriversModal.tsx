import { Driver, Contract } from "@/types";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { DriverActions } from "@/components/drivers/DriverActions";

interface Props {
  contract: Contract | null;
  drivers: Driver[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
  onAdd: (contractId: string) => void;
}

export default function ContractDriversModal({ contract, drivers, isOpen, onClose, onEdit, onDelete, onAdd }: Props) {
  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={contract ? `Choferes - ${contract.description}` : "Choferes"}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">{drivers.length} chofer(es)</div>
        <div>
          <Button size="sm" onClick={() => contract && onAdd(contract.id)} className="bg-primary text-white">Agregar Chofer</Button>
        </div>
      </div>

      <div className="space-y-3">
        {drivers.length === 0 && <p className="text-sm text-gray-600">No hay choferes para este contrato.</p>}
        {drivers.map((driver) => (
          <div key={(driver as any).document_number || (driver as any).id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <div className="font-medium">{driver.name} {driver.last_name}</div>
              <div className="text-sm text-gray-600">Cédula: {driver.document_number} • {driver.telephone}</div>
              <div className="text-sm text-gray-500">{driver.address}</div>
            </div>
            <div>
              <DriverActions driver={driver} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </div>
        ))}
      </div>
    </FormModal>
  );
}
