import { useCallback, useEffect, useMemo, useState } from "react";
import { FormModal } from "@/components/shared/FormModal";
import { CriticalGuidesPanel } from "@/components/troubleshooting/CriticalGuidesPanel";
import { DeleteGuideDialog } from "@/components/troubleshooting/DeleteGuideDialog";
import { GuideDetailDialog } from "@/components/troubleshooting/GuideDetailDialog";
import { GuideFilters } from "@/components/troubleshooting/GuideFilters";
import { GuideSummaryCards } from "@/components/troubleshooting/GuideSummaryCards";
import { GuidesTable } from "@/components/troubleshooting/GuidesTable";
import { TroubleshootingGuideForm } from "@/components/troubleshooting/TroubleshootingGuideForm";
import { useCategoryCatalog } from "@/components/troubleshooting/useCategoryCatalog";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  DEFAULT_GUIDE_PAGE_SIZE,
  useCriticalGuides,
  useGuideMutations,
  useGuidesPage,
} from "@/hooks/useTroubleshooting";
import {
  TroubleshootingGuide,
  TroubleshootingGuideFilters,
  TroubleshootingGuidePayload,
} from "@/types";
import { RefreshCw } from "lucide-react";

type AppliedFilters = Omit<TroubleshootingGuideFilters, "search" | "limit" | "offset">;

const emptyFilters: AppliedFilters = {
  category: "",
  severity: "",
  status: "",
  requires_workshop: undefined,
};

export default function Troubleshooting() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<AppliedFilters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_GUIDE_PAGE_SIZE);

  const [selectedGuide, setSelectedGuide] = useState<TroubleshootingGuide | null>(null);
  const [editingGuide, setEditingGuide] = useState<TroubleshootingGuide | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [guideToDelete, setGuideToDelete] = useState<TroubleshootingGuide | null>(null);

  // La busqueda va con retardo: una peticion por pausa de tecleo, no por tecla.
  const debouncedSearch = useDebouncedValue(searchTerm);

  const queryFilters = useMemo<TroubleshootingGuideFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [debouncedSearch, filters]
  );

  const guidesQuery = useGuidesPage({ filters: queryFilters, page, pageSize });
  const criticalQuery = useCriticalGuides();
  const { createGuide, updateGuide, deleteGuide, isDeleting } = useGuideMutations();

  const guides = useMemo(() => guidesQuery.data?.items ?? [], [guidesQuery.data]);
  const criticalGuides = useMemo(() => criticalQuery.data?.items ?? [], [criticalQuery.data]);

  // El catalogo de categorias se nutre de todo lo que haya llegado del backend.
  const knownGuides = useMemo(
    () => [...guides, ...criticalGuides],
    [criticalGuides, guides]
  );
  const categories = useCategoryCatalog(knownGuides);

  // Cambiar la busqueda reinicia la paginacion: la pagina 3 del filtro anterior
  // no significa nada para el nuevo resultado.
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  // Si al borrar el ultimo registro la pagina queda vacia, retrocede una.
  useEffect(() => {
    if (!guidesQuery.isFetching && page > 0 && guides.length === 0) {
      setPage((current) => Math.max(current - 1, 0));
    }
  }, [guides.length, guidesQuery.isFetching, page]);

  const handleFiltersChange = useCallback((patch: Partial<AppliedFilters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
    setPage(0);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm("");
    setFilters(emptyFilters);
    setPage(0);
  }, []);

  const handlePageSizeChange = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(0);
  }, []);

  const openEditor = useCallback((guide: TroubleshootingGuide) => {
    setSelectedGuide(null);
    setEditingGuide(guide);
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingGuide(null);
  }, []);

  const handleSubmitGuide = useCallback(
    async (payload: TroubleshootingGuidePayload) => {
      const ok = editingGuide
        ? await updateGuide(editingGuide.id, payload)
        : await createGuide(payload);

      if (ok) closeForm();
      return ok;
    },
    [closeForm, createGuide, editingGuide, updateGuide]
  );

  const handleConfirmDelete = useCallback(
    async (guide: TroubleshootingGuide) => {
      const ok = await deleteGuide(guide);
      if (ok) setGuideToDelete(null);
    },
    [deleteGuide]
  );

  const hasActiveFilters = Boolean(
    searchTerm ||
      filters.category ||
      filters.severity ||
      filters.status ||
      filters.requires_workshop !== undefined
  );

  const isRefreshing = guidesQuery.isFetching || criticalQuery.isFetching;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">Manual de fallas</h1>
          <p className="text-sm text-secondary-dark">
            Guias de que hacer ante las fallas que se repiten en las unidades.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void guidesQuery.refetch();
            void criticalQuery.refetch();
          }}
          disabled={isRefreshing}
          className="border-primary-200 text-primary hover:bg-primary-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <GuideSummaryCards guides={guides} />

      <CriticalGuidesPanel
        guides={criticalGuides}
        hasMore={criticalQuery.data?.hasMore ?? false}
        onSelect={setSelectedGuide}
      />

      <GuideFilters
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        categories={categories}
        hasActiveFilters={hasActiveFilters}
        isFetching={guidesQuery.isFetching}
        onClear={handleClearFilters}
      />

      <GuidesTable
        guides={guides}
        isLoading={guidesQuery.isLoading}
        page={page}
        pageSize={pageSize}
        hasMore={guidesQuery.data?.hasMore ?? false}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onView={setSelectedGuide}
        onEdit={openEditor}
        onDelete={setGuideToDelete}
        onAdd={() => {
          setEditingGuide(null);
          setIsFormOpen(true);
        }}
      />

      <GuideDetailDialog
        guide={selectedGuide}
        isOpen={Boolean(selectedGuide)}
        onClose={() => setSelectedGuide(null)}
        onEdit={openEditor}
      />

      <FormModal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingGuide ? `Editar falla ${editingGuide.code}` : "Nueva falla"}
      >
        <TroubleshootingGuideForm
          editingGuide={editingGuide}
          categorySuggestions={categories}
          onSubmit={handleSubmitGuide}
          onCancel={closeForm}
        />
      </FormModal>

      <DeleteGuideDialog
        guide={guideToDelete}
        isDeleting={isDeleting}
        onCancel={() => setGuideToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
