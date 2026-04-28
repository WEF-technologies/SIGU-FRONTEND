import { FormModal } from "@/components/shared/FormModal";
import { ToolForm } from "./ToolForm";
import { Tool, ToolPayload } from "@/types";

interface ToolFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTool?: Tool | null;
  onSubmit: (payload: ToolPayload) => Promise<boolean>;
}

export function ToolFormModal({ isOpen, onClose, editingTool, onSubmit }: ToolFormModalProps) {
  const handleSubmit = async (payload: ToolPayload) => {
    const ok = await onSubmit(payload);
    if (ok) {
      onClose();
    }
    return ok;
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTool ? "Editar Herramienta" : "Registrar Herramienta"}
    >
      <ToolForm editingTool={editingTool} onSubmit={handleSubmit} onCancel={onClose} />
    </FormModal>
  );
}
