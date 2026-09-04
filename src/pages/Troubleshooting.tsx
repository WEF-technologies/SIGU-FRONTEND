import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { GuideDetailDialog } from "@/components/troubleshooting/GuideDetailDialog";
import { TroubleshootingGuideForm } from "@/components/troubleshooting/TroubleshootingGuideForm";
import {
  formatCategory,
  formatSeverity,
  formatStatus,
  getSeverityBadgeClass,
  getSeverityWeight,
  getStatusBadgeClass,
} from "@/components/troubleshooting/guideUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTroubleshooting } from "@/hooks/useTroubleshooting";
import {
  GUIDE_SEVERITY_OPTIONS,
  GUIDE_STATUS_OPTIONS,
  TROUBLESHOOTING_CATEGORY_SUGGESTIONS,
  TroubleshootingGuide,
  TroubleshootingGuideFilters,
  TroubleshootingGuidePayload,
} from "@/types";
import {
  AlertTriangle,
  BookOpen,
  Edit,
  Eye,
  LifeBuoy,
  RefreshCw,
  Trash2,
  Wrench,
} from "lucide-react";

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const createEmptyFilters = (): TroubleshootingGuideFilters => ({
  search: "",
  category: "",
  severity: "",
  status: "",
  requires_workshop: undefined,
});

export default function Troubleshooting() {
  const { guides, isLoadingGuides, fetchGuides, createGuide, updateGuide, deleteGuide } =
    useTroubleshooting();

  const [filters, setFilters] = useState<TroubleshootingGuideFilters>(createEmptyFilters());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<TroubleshootingGuide | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<TroubleshootingGuide | null>(null);

  const criticalGuides = useMemo(
    () =>
      guides
        .filter((guide) => guide.status === "activa" && guide.severity === "critica")
        .sort((a, b) => a.code.localeCompare(b.code, "es")),
    [guides]
  );

  const summaryCards = useMemo(() => {
    const activeGuides = guides.filter((guide) => guide.status === "activa");
    const workshopGuides = guides.filter((guide) => guide.requires_workshop);

    return [
      { title: "Fallas documentadas", value: guides.length, icon: BookOpen },
      { title: "Guias activas", value: activeGuides.length, icon: LifeBuoy },
      { title: "Criticas", value: criticalGuides.length, icon: AlertTriangle },
      { title: "Requieren taller", value: workshopGuides.length, icon: Wrench },
    ];
  }, [criticalGuides.length, guides]);

  // Combina las categorías sugeridas con las que ya existen en el manual, para
  // que el filtro por categoría coincida exactamente con lo que espera el backend.
  const categoryOptions = useMemo(() => {
    const values = new Set<string>(TROUBLESHOOTING_CATEGORY_SUGGESTIONS);
    guides.forEach((guide) => {
      const category = guide.category.trim();
      if (category) values.add(category);
    });

    return Array.from(values).sort((a, b) => a.localeCompare(b, "es"));
  }, [guides]);

  const openDetail = (guide: TroubleshootingGuide) => setSelectedGuide(guide);

  const openEditor = (guide: TroubleshootingGuide) => {
    setSelectedGuide(null);
    setEditingGuide(guide);
    setIsFormOpen(true);
  };

  const columns = useMemo<Column<TroubleshootingGuide>[]>(
    () => [
      {
        key: "code",
        header: "Falla",
        render: (_, guide) => (
          <div>
            <p className="font-medium text-gray-900">
              {guide.code} · {guide.title}
            </p>
            <p className="line-clamp-2 text-xs text-gray-500">{guide.symptom}</p>
          </div>
        ),
      },
      {
        key: "category",
        header: "Categoria",
        render: (value) => (
          <Badge variant="outline" className="border-primary-200 text-primary-800">
            {formatCategory(String(value ?? ""))}
          </Badge>
        ),
      },
      {
        key: "severity",
        header: "Severidad",
        sortValue: (guide) => getSeverityWeight(guide.severity),
        render: (_, guide) => (
          <Badge variant="outline" className={getSeverityBadgeClass(guide.severity)}>
            {formatSeverity(guide.severity)}
          </Badge>
        ),
      },
      {
        key: "resolution_steps",
        header: "Pasos",
        sortValue: (guide) => guide.resolution_steps.length,
        render: (_, guide) => (
          <span className="text-sm text-gray-700">{guide.resolution_steps.length}</span>
        ),
      },
      {
        key: "requires_workshop",
        header: "Taller",
        render: (value) =>
          value ? (
            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
              Requiere taller
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              En ruta
            </Badge>
          ),
      },
      {
        key: "status",
        header: "Estado",
        render: (_, guide) => (
          <Badge variant="outline" className={getStatusBadgeClass(guide.status)}>
            {formatStatus(guide.status)}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "Acciones",
        sortable: false,
        render: (_, guide) => (
          // Sin wrap: las tres acciones caben en una linea y la tabla ya scrollea en horizontal.
          <div className="flex flex-nowrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-primary-200 text-primary hover:bg-primary-50"
              onClick={() => openDetail(guide)}
              aria-label={`Ver la falla ${guide.code}`}
            >
              <Eye className="h-4 w-4" />
              Ver
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-primary-200 text-primary hover:bg-primary-50"
              onClick={() => openEditor(guide)}
              aria-label={`Editar la falla ${guide.code}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (!confirm(`¿Eliminar la falla ${guide.code} del manual?`)) return;
                await deleteGuide(guide);
              }}
              aria-label={`Eliminar la falla ${guide.code}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [deleteGuide]
  );

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingGuide(null);
  };

  const applyFilters = async (nextFilters: TroubleshootingGuideFilters) => {
    setFilters(nextFilters);
    setIsRefreshing(true);
    try {
      await fetchGuides(nextFilters);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmitGuide = async (payload: TroubleshootingGuidePayload) => {
    const ok = editingGuide
      ? await updateGuide(editingGuide.id, payload)
      : await createGuide(payload);

    if (ok) {
      closeForm();
    }

    return ok;
  };

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
          onClick={() => void applyFilters(filters)}
          disabled={isRefreshing}
          className="border-primary-200 text-primary hover:bg-primary-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-secondary-dark">{card.title}</p>
                <p className="mt-2 text-3xl font-bold text-primary-900">{card.value}</p>
              </div>
              <div className="rounded-full bg-primary-50 p-3 text-primary">
                <card.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {criticalGuides.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl text-primary-900">Fallas criticas</CardTitle>
              <p className="text-sm text-secondary-dark">
                Acceso directo a las guias que dejan la unidad fuera de servicio.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-red-200 bg-red-50 text-red-700">
              {criticalGuides.length} criticas
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {criticalGuides.map((guide) => (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => openDetail(guide)}
                  className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-primary-900">{guide.code}</p>
                      <p className="mt-1 text-sm text-gray-800">{guide.title}</p>
                    </div>
                    <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-secondary-dark">{guide.symptom}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="border-primary-200 text-primary-800">
                      {formatCategory(guide.category)}
                    </Badge>
                    <Badge variant="outline" className="border-slate-200 text-slate-600">
                      {guide.resolution_steps.length} pasos
                    </Badge>
                    {guide.requires_workshop ? (
                      <Badge
                        variant="outline"
                        className="border-orange-200 bg-orange-50 text-orange-700"
                      >
                        Requiere taller
                      </Badge>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-primary-900">Buscar en el manual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              void applyFilters(filters);
            }}
          >
            <div>
              <Label htmlFor="guide-search">Busqueda</Label>
              <Input
                id="guide-search"
                value={filters.search ?? ""}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, search: event.target.value }))
                }
                placeholder="Codigo, titulo o sintoma"
              />
            </div>
            <div>
              <Label htmlFor="guide-category-filter">Categoria</Label>
              <select
                id="guide-category-filter"
                value={filters.category ?? ""}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, category: event.target.value }))
                }
                className={selectClassName}
              >
                <option value="">Todas</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatCategory(option)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="guide-severity-filter">Severidad</Label>
              <select
                id="guide-severity-filter"
                value={filters.severity ?? ""}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, severity: event.target.value }))
                }
                className={selectClassName}
              >
                <option value="">Todas</option>
                {GUIDE_SEVERITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="guide-status-filter">Estado</Label>
              <select
                id="guide-status-filter"
                value={filters.status ?? ""}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, status: event.target.value }))
                }
                className={selectClassName}
              >
                <option value="">Todos</option>
                {GUIDE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
          </form>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-secondary-medium bg-secondary-light/60 p-3">
            <span className="text-sm font-medium text-primary-900">Vista rapida:</span>
            <Button
              type="button"
              variant={filters.requires_workshop === undefined ? "default" : "outline"}
              className={
                filters.requires_workshop === undefined
                  ? "bg-primary hover:bg-primary-600 text-white"
                  : "border-primary-200 bg-white text-primary hover:bg-primary-50"
              }
              onClick={() => void applyFilters({ ...filters, requires_workshop: undefined })}
              disabled={isRefreshing}
            >
              Todas
            </Button>
            <Button
              type="button"
              variant={filters.requires_workshop === false ? "default" : "outline"}
              className={
                filters.requires_workshop === false
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "border-primary-200 bg-white text-primary hover:bg-primary-50"
              }
              onClick={() => void applyFilters({ ...filters, requires_workshop: false })}
              disabled={isRefreshing}
            >
              Resolubles en ruta
            </Button>
            <Button
              type="button"
              variant={filters.requires_workshop === true ? "default" : "outline"}
              className={
                filters.requires_workshop === true
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "border-primary-200 bg-white text-primary hover:bg-primary-50"
              }
              onClick={() => void applyFilters({ ...filters, requires_workshop: true })}
              disabled={isRefreshing}
            >
              <Wrench className="h-4 w-4" />
              Requieren taller
            </Button>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => void applyFilters(createEmptyFilters())}>
              Limpiar
            </Button>
            <Button
              onClick={() => void applyFilters(filters)}
              className="bg-primary hover:bg-primary-600 text-white"
              disabled={isRefreshing}
            >
              Aplicar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTable
        title="Listado general"
        data={guides}
        columns={columns}
        onAdd={() => {
          setEditingGuide(null);
          setIsFormOpen(true);
        }}
        addButtonText="Agregar falla"
        isLoading={isLoadingGuides}
        searchPlaceholder="Filtrar resultados cargados..."
        searchAccessor={(guide) =>
          [guide.code, guide.title, guide.category, guide.symptom, guide.probable_causes ?? ""].join(
            " "
          )
        }
        defaultSort={{ key: "code", direction: "asc" }}
        initialPageSize={20}
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
          onSubmit={handleSubmitGuide}
          onCancel={closeForm}
        />
      </FormModal>
    </div>
  );
}
