import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { AlertCountBadge } from "@/components/shared/AlertCountBadge";
import { AlertSummaryBanner } from "@/components/shared/AlertSummaryBanner";
import { FilterPanel, FilterSelect } from "@/components/shared/FilterPanel";
import { PageHeader } from "@/components/shared/PageHeader";
import { TwoLineCell } from "@/components/shared/TwoLineCell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionSwitch } from "@/components/shared/SectionSwitch";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
import { fetchAllPages } from "@/lib/apiClient";
import { useConfirm } from "@/hooks/useConfirm";
import {
  CreateFuelLogPayload,
  CreateFluidMovementPayload,
  CreateFluidProductPayload,
  CreateFluidRulePayload,
  CreateFluidServicePayload,
  FluidAlert,
  FluidMovement,
  FluidMovementType,
  FluidProduct,
  FluidRule,
  FluidService,
  UpdateFluidProductPayload,
  UpdateFluidRulePayload,
  Vehicle,
} from "@/types";
import { FluidsApiError, fluidsApi } from "@/services/fluidsApi";
import {
  FLUID_TYPE_LABELS,
  MOVEMENT_LABELS,
  formatDate,
  formatNumber,
  parseNumber,
} from "@/components/fluids/fluidConstants";
import {
  FluidAlertView,
  describeFluidAlert,
  getFluidAlertSubject,
  isFluidAlertActive,
} from "@/components/fluids/fluidAlerts";
import { AlertTone, getAlertToneBadgeClass, pluralize } from "@/lib/alertTone";
import { FilterOption, countActiveFilters, matchesOption } from "@/lib/filtering";
import { toDateOnlyLocalValue } from "@/lib/dates";
import { FluidProductForm } from "@/components/fluids/FluidProductForm";
import { FluidRuleForm } from "@/components/fluids/FluidRuleForm";
import { FluidMovementForm } from "@/components/fluids/FluidMovementForm";
import { RegisterConsumptionForm } from "@/components/consumption/RegisterConsumptionForm";
import { buildLastOdometerMap } from "@/components/consumption/lastOdometer";
import { fuelApi } from "@/services/fuelApi";
import {
  DEFAULT_PRODUCT_FORM,
  DEFAULT_RULE_FORM,
  FluidMovementFormValues,
  FluidProductFormValues,
  FluidRuleFormValues,
  mapProductToFormValues,
  mapRuleToFormValues,
} from "@/components/fluids/fluidFormValues";
import { PackagePlus, RefreshCw, Wrench } from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// Las pestañas responden a "que quiero hacer"; la vista interna elige el
// detalle dentro de esa respuesta.
type TabKey = "alertas" | "unidades" | "inventario";
type InventoryView = "products" | "movements";
type UnitsView = "services" | "rules";

interface FluidAlertRow extends FluidAlert {
  view: FluidAlertView;
  subject: { primary: string; secondary: string };
}

/** Filtros de la pestaña Alertas (en el cliente); "" = sin filtro. */
const EMPTY_ALERT_FILTERS = { tone: "", kind: "" };

const ALERT_TONE_OPTIONS: FilterOption[] = [
  { value: "critical", label: "Críticas" },
  { value: "warning", label: "Por atender pronto" },
];

const ALERT_KIND_OPTIONS: FilterOption[] = [
  { value: "service", label: "Servicio de unidad" },
  { value: "stock", label: "Inventario" },
];

const TONE_RANK: Record<AlertTone, number> = { critical: 0, warning: 1, ok: 2, muted: 3 };

/** Movimientos que suman al inventario; el resto descuenta. */
const INBOUND_MOVEMENTS = new Set<FluidMovementType>(["opening_balance", "purchase", "adjustment_in"]);

const withUnit = (value: number | null | undefined, unit?: string) =>
  `${formatNumber(value)}${unit ? ` ${unit}` : ""}`;

/** Producto con su estado de stock: "Sin stock" (rojo), "Stock bajo" (ambar) o nada. */
const getStockTone = (product: FluidProduct): AlertTone | null => {
  if (product.stock_quantity <= 0) return "critical";
  if (product.stock_quantity <= product.min_stock_quantity) return "warning";
  return null;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof FluidsApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const extractVehicles = (payload: unknown): Vehicle[] => {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Vehicle =>
      typeof item === "object" && item !== null && typeof (item as Vehicle).id === "string"
    );
  }

  if (typeof payload !== "object" || payload === null) return [];

  const record = payload as Record<string, unknown>;
  const collectionCandidates = [record.items, record.results, record.data, record.vehicles];
  for (const candidate of collectionCandidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Vehicle =>
        typeof item === "object" && item !== null && typeof (item as Vehicle).id === "string"
      );
    }
  }

  if (typeof record.data === "object" && record.data !== null) {
    const nested = record.data as Record<string, unknown>;
    const nestedCandidates = [nested.items, nested.results, nested.vehicles];
    for (const candidate of nestedCandidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter((item): item is Vehicle =>
          typeof item === "object" && item !== null && typeof (item as Vehicle).id === "string"
        );
      }
    }
  }

  return [];
};

export default function Fluids() {
  const { toast } = useToast();
  const authenticatedFetch = useAuthenticatedFetch();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<TabKey>("alertas");
  const [inventoryView, setInventoryView] = useState<InventoryView>("products");
  const [unitsView, setUnitsView] = useState<UnitsView>("services");

  const [products, setProducts] = useState<FluidProduct[]>([]);
  const [rules, setRules] = useState<FluidRule[]>([]);
  const [services, setServices] = useState<FluidService[]>([]);
  const [movements, setMovements] = useState<FluidMovement[]>([]);
  const [alerts, setAlerts] = useState<FluidAlert[]>([]);
  const [hasAlertsError, setHasAlertsError] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [alertFilters, setAlertFilters] = useState(EMPTY_ALERT_FILTERS);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<FluidProduct | null>(null);
  const [editingRule, setEditingRule] = useState<FluidRule | null>(null);
  /** Unidad y producto precargados al registrar un servicio desde una alerta. */
  const [serviceTarget, setServiceTarget] = useState<{ vehicleId?: string; productId?: string } | null>(null);
  /** Producto precargado al reponer stock desde una alerta. */
  const [movementProductId, setMovementProductId] = useState<string | undefined>(undefined);

  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isSavingService, setIsSavingService] = useState(false);
  const [isSavingMovement, setIsSavingMovement] = useState(false);

  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  );

  const loadVehicles = useCallback(async (): Promise<Vehicle[]> => {
    const response = await fetchAllPages(authenticatedFetch, `${API_BASE_URL}/api/v1/vehicles/`);
    if (!response.ok) {
      throw new FluidsApiError(
        response.status,
        "No se pudieron cargar las unidades para el módulo de fluidos."
      );
    }

    const payload = await response.json();
    return extractVehicles(payload);
  }, [authenticatedFetch]);

  const loadData = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoadingData(true);
    }

    const results = await Promise.allSettled([
      fluidsApi.listProducts(authenticatedFetch),
      fluidsApi.listRules(authenticatedFetch),
      fluidsApi.listServices(authenticatedFetch),
      fluidsApi.listMovements(authenticatedFetch),
      fluidsApi.getAlerts(authenticatedFetch),
      loadVehicles(),
    ]);

    const [productsResult, rulesResult, servicesResult, movementsResult, alertsResult, vehiclesResult] = results;

    const failures = results.filter((result) => result.status === "rejected").length;

    if (productsResult.status === "fulfilled") setProducts(productsResult.value);
    if (rulesResult.status === "fulfilled") setRules(rulesResult.value);
    if (servicesResult.status === "fulfilled") setServices(servicesResult.value);
    if (movementsResult.status === "fulfilled") setMovements(movementsResult.value);
    if (alertsResult.status === "fulfilled") setAlerts(alertsResult.value);
    setHasAlertsError(alertsResult.status === "rejected");
    if (vehiclesResult.status === "fulfilled") setVehicles(vehiclesResult.value);

    if (failures > 0 && !silent) {
      const firstError = results.find((result) => result.status === "rejected");
      const message =
        firstError && firstError.status === "rejected"
          ? getErrorMessage(firstError.reason, "No se pudieron cargar algunos datos del módulo de fluidos.")
          : "No se pudieron cargar algunos datos del módulo de fluidos.";

      toast({
        title: "Carga parcial",
        description: message,
        variant: "destructive",
      });
    }

    if (silent) {
      setIsRefreshing(false);
    } else {
      setIsLoadingData(false);
    }
  }, [authenticatedFetch, loadVehicles, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const productByCode = useMemo(() => new Map(products.map((product) => [product.code, product])), [products]);

  const findAlertProduct = useCallback(
    (alert: FluidAlert) =>
      (alert.product_id ? productById.get(alert.product_id) : undefined) ??
      (alert.product_code ? productByCode.get(alert.product_code) : undefined),
    [productByCode, productById]
  );

  /** Solo alertas criticas y de advertencia, ya traducidas a texto legible. */
  const activeAlertRows = useMemo<FluidAlertRow[]>(
    () =>
      alerts.filter(isFluidAlertActive).map((alert) => {
        const product = findAlertProduct(alert);
        return {
          ...alert,
          view: describeFluidAlert(alert, product),
          subject: getFluidAlertSubject(alert, product),
        };
      }),
    [alerts, findAlertProduct]
  );

  const criticalAlerts = activeAlertRows.filter((row) => row.view.tone === "critical");
  const warningCount = activeAlertRows.filter((row) => row.view.tone === "warning").length;
  const criticalServiceCount = criticalAlerts.filter((row) => row.kind === "service").length;
  const criticalStockCount = criticalAlerts.filter((row) => row.kind === "stock").length;

  const alertRows = useMemo(
    () =>
      activeAlertRows.filter(
        (row) => matchesOption(alertFilters.tone, row.view.tone) && matchesOption(alertFilters.kind, row.kind)
      ),
    [activeAlertRows, alertFilters]
  );

  const criticalDescription = [
    criticalServiceCount > 0
      ? `${criticalServiceCount} ${pluralize(criticalServiceCount, "servicio vencido o sin registrar", "servicios vencidos o sin registrar")}`
      : null,
    criticalStockCount > 0
      ? `${criticalStockCount} ${pluralize(criticalStockCount, "producto sin stock", "productos sin stock")}`
      : null,
  ]
    .filter(Boolean)
    .join(" y ");

  const openServiceModal = (target: { vehicleId?: string; productId?: string } | null = null) => {
    setServiceTarget(target);
    setIsServiceModalOpen(true);
  };

  const openMovementModal = (productId?: string) => {
    setMovementProductId(productId);
    setIsMovementModalOpen(true);
  };

  const resolveAlert = (row: FluidAlertRow) => {
    if (row.kind === "stock") {
      openMovementModal(findAlertProduct(row)?.id);
      return;
    }

    const vehicle = vehicles.find((entry) => entry.plate_number === row.vehicle_plate);
    openServiceModal({ vehicleId: vehicle?.id, productId: findAlertProduct(row)?.id });
  };

  const showAlertsTab = () => {
    setAlertFilters(EMPTY_ALERT_FILTERS);
    setActiveTab("alertas");
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: FluidProduct) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const openNewRuleModal = () => {
    setEditingRule(null);
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: FluidRule) => {
    setEditingRule(rule);
    setIsRuleModalOpen(true);
  };

  const handleDeleteProduct = async (product: FluidProduct) => {
    if (!(await confirm({
      title: "Eliminar producto",
      description: `Se eliminará el producto ${product.code}. Esta acción no se puede deshacer.`,
    }))) return;

    try {
      await fluidsApi.deleteProduct(authenticatedFetch, product.id);
      toast({
        title: "Producto eliminado",
        description: `${product.code} fue eliminado correctamente.`,
      });
      await loadData(true);
    } catch (error) {
      toast({
        title: "Error al eliminar producto",
        description: getErrorMessage(error, "No se pudo eliminar el producto de fluido."),
        variant: "destructive",
      });
    }
  };

  const handleDeleteRule = async (rule: FluidRule) => {
    if (!(await confirm({
      title: "Eliminar regla de fluido",
      description: "La regla dejará de generar avisos para las unidades. Esta acción no se puede deshacer.",
    }))) return;

    try {
      await fluidsApi.deleteRule(authenticatedFetch, rule.id);
      toast({ title: "Regla eliminada", description: "La regla fue eliminada correctamente." });
      await loadData(true);
    } catch (error) {
      toast({
        title: "Error al eliminar regla",
        description: getErrorMessage(error, "No se pudo eliminar la regla de fluido."),
        variant: "destructive",
      });
    }
  };

  const handleSubmitProduct = async (values: FluidProductFormValues) => {
    if (!values.code.trim()) {
      toast({ title: "Código requerido", description: "Ingresa el código del producto.", variant: "destructive" });
      return;
    }

    const stockQuantity = parseNumber(values.stock_quantity);
    const minStockQuantity = parseNumber(values.min_stock_quantity);

    if (stockQuantity !== undefined && stockQuantity < 0) {
      toast({ title: "Stock inválido", description: "El stock no puede ser negativo.", variant: "destructive" });
      return;
    }

    if (minStockQuantity !== undefined && minStockQuantity < 0) {
      toast({ title: "Mínimo inválido", description: "El stock mínimo no puede ser negativo.", variant: "destructive" });
      return;
    }

    const specification =
      values.description.trim() || values.name.trim() || values.code.trim().toUpperCase();

    const payload: CreateFluidProductPayload | UpdateFluidProductPayload = {
      code: values.code.trim().toUpperCase(),
      fluid_type: values.fluid_type,
      ...(specification ? { specification } : {}),
      ...(values.name.trim() ? { name: values.name.trim() } : {}),
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
      ...(stockQuantity !== undefined ? { stock_quantity: stockQuantity } : {}),
      ...(minStockQuantity !== undefined ? { min_stock_quantity: minStockQuantity } : {}),
      ...(values.unit.trim() ? { unit: values.unit.trim() } : {}),
      ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
    };

    setIsSavingProduct(true);
    try {
      if (editingProduct) {
        await fluidsApi.updateProduct(authenticatedFetch, editingProduct.id, payload as UpdateFluidProductPayload);
        toast({ title: "Producto actualizado", description: "Se actualizó el producto de fluido." });
      } else {
        await fluidsApi.createProduct(authenticatedFetch, payload as CreateFluidProductPayload);
        toast({ title: "Producto creado", description: "Se registró el producto de fluido." });
      }

      setIsProductModalOpen(false);
      setEditingProduct(null);
      await loadData(true);
    } catch (error) {
      toast({
        title: editingProduct ? "Error al actualizar" : "Error al crear",
        description: getErrorMessage(error, "No se pudo guardar el producto de fluido."),
        variant: "destructive",
      });
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleSubmitRule = async (values: FluidRuleFormValues) => {
    const capacityLiters = parseNumber(values.capacity_liters);
    const intervalKm = parseNumber(values.interval_km);
    const intervalDays = parseNumber(values.interval_days);

    if (!capacityLiters || capacityLiters <= 0) {
      toast({
        title: "Capacidad requerida",
        description: "La capacidad de fluido debe ser mayor a cero.",
        variant: "destructive",
      });
      return;
    }

    if (!intervalKm && !intervalDays) {
      toast({
        title: "Intervalo requerido",
        description: "Define al menos un intervalo por km o por días.",
        variant: "destructive",
      });
      return;
    }

    const selectedVehicle = vehicleById.get(values.vehicle_id);
    if (!editingRule && !selectedVehicle) {
      toast({
        title: "Unidad requerida",
        description: "Selecciona la unidad para crear la regla.",
        variant: "destructive",
      });
      return;
    }

    const createPayload: CreateFluidRulePayload = {
      fluid_type: values.fluid_type,
      capacity_liters: capacityLiters,
      ...(selectedVehicle?.id ? { vehicle_id: selectedVehicle.id } : {}),
      ...(selectedVehicle?.id ? { unit_id: selectedVehicle.id } : {}),
      ...(selectedVehicle?.plate_number ? { vehicle_plate: selectedVehicle.plate_number } : {}),
      ...(selectedVehicle?.plate_number ? { plate_number: selectedVehicle.plate_number } : {}),
      ...(values.product_id ? { product_id: values.product_id } : {}),
      ...(values.product_id ? { fluid_product_id: values.product_id } : {}),
      ...(intervalKm ? { interval_km: intervalKm } : {}),
      ...(intervalDays ? { interval_days: intervalDays } : {}),
      ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
    };

    const updatePayload: UpdateFluidRulePayload = {
      fluid_type: values.fluid_type,
      capacity_liters: capacityLiters,
      ...(values.product_id ? { product_id: values.product_id } : {}),
      ...(values.product_id ? { fluid_product_id: values.product_id } : {}),
      ...(intervalKm ? { interval_km: intervalKm } : {}),
      ...(intervalDays ? { interval_days: intervalDays } : {}),
      ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
    };

    setIsSavingRule(true);
    try {
      if (editingRule) {
        await fluidsApi.updateRule(authenticatedFetch, editingRule.id, updatePayload);
        toast({ title: "Regla actualizada", description: "La regla de fluido se actualizó." });
      } else {
        await fluidsApi.createRule(authenticatedFetch, createPayload);
        toast({ title: "Regla creada", description: "La regla de fluido fue registrada." });
      }

      setIsRuleModalOpen(false);
      setEditingRule(null);
      await loadData(true);
    } catch (error) {
      toast({
        title: editingRule ? "Error al actualizar" : "Error al crear",
        description: getErrorMessage(error, "No se pudo guardar la regla de fluido."),
        variant: "destructive",
      });
    } finally {
      setIsSavingRule(false);
    }
  };

  /** Último kilometraje conocido por unidad, para precargar el odómetro. */
  const lastOdometerByVehicleId = useMemo(
    () =>
      buildLastOdometerMap(
        vehicles,
        services.map((service) => ({
          vehicleId: service.vehicle_id,
          vehiclePlate: service.vehicle_plate,
          odometerKm: service.odometer_km,
        }))
      ),
    [services, vehicles]
  );

  const handleRegisterFluidService = async (payload: CreateFluidServicePayload) => {
    setIsSavingService(true);
    try {
      await fluidsApi.createService(authenticatedFetch, payload);
      toast({ title: "Servicio registrado", description: "Se registró el servicio de fluido." });
      setIsServiceModalOpen(false);
      await loadData(true);
      return true;
    } catch (error) {
      toast({
        title: "Error al registrar servicio",
        description: getErrorMessage(error, "No se pudo registrar el servicio de fluido."),
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSavingService(false);
    }
  };

  /**
   * El mismo formulario permite anotar una carga de combustible: el acto es el
   * mismo y no obliga a cambiar de módulo. Va directo a su propio endpoint.
   */
  const handleRegisterFuelLog = async (payload: CreateFuelLogPayload) => {
    setIsSavingService(true);
    try {
      await fuelApi.createLog(authenticatedFetch, payload);
      toast({ title: "Carga registrada", description: "Se registró la carga de combustible." });
      setIsServiceModalOpen(false);
      return true;
    } catch (error) {
      toast({
        title: "Error al registrar carga",
        description: getErrorMessage(error, "No se pudo registrar la carga de combustible."),
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSavingService(false);
    }
  };

  const handleSubmitMovement = async (values: FluidMovementFormValues) => {
    const quantity = parseNumber(values.quantity);
    const occurredAt = values.occurred_at?.trim() || toDateOnlyLocalValue();

    if (!values.product_id) {
      toast({ title: "Producto requerido", description: "Selecciona un producto.", variant: "destructive" });
      return;
    }

    if (!quantity || quantity <= 0) {
      toast({ title: "Cantidad inválida", description: "La cantidad debe ser mayor a cero.", variant: "destructive" });
      return;
    }

    const payload: CreateFluidMovementPayload = {
      product_id: values.product_id,
      fluid_product_id: values.product_id,
      movement_type: values.movement_type,
      quantity,
      occurred_at: occurredAt,
      ...(values.reference.trim() ? { reference: values.reference.trim() } : {}),
      ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
    };

    setIsSavingMovement(true);
    try {
      await fluidsApi.createMovement(authenticatedFetch, payload);
      toast({ title: "Movimiento registrado", description: "Se registró el movimiento de inventario." });
      setIsMovementModalOpen(false);
      await loadData(true);
    } catch (error) {
      toast({
        title: "Error al registrar movimiento",
        description: getErrorMessage(error, "No se pudo registrar el movimiento de inventario."),
        variant: "destructive",
      });
    } finally {
      setIsSavingMovement(false);
    }
  };

  const getProductCode = (productId?: string, fallback?: string) =>
    fallback || (productId ? productById.get(productId)?.code : undefined) || "-";

  const getPlate = (vehicleId?: string, fallback?: string) =>
    fallback || vehicleById.get(vehicleId || "")?.plate_number || "-";

  const alertColumns: Column<FluidAlertRow>[] = [
    {
      key: "vehicle_plate",
      header: "Unidad / producto",
      render: (_, row) => <TwoLineCell primary={row.subject.primary} secondary={row.subject.secondary} />,
      sortValue: (row) => row.subject.primary,
    },
    {
      key: "severity",
      header: "Alerta",
      render: (_, row) => (
        <div className="space-y-1">
          <Badge variant="outline" className={getAlertToneBadgeClass(row.view.tone)}>
            {row.view.label}
          </Badge>
          <p className="text-sm text-gray-600">{row.view.detail}</p>
        </div>
      ),
      sortValue: (row) => TONE_RANK[row.view.tone],
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (_, row) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => resolveAlert(row)}
          className="border-primary-200 text-primary hover:bg-primary-50"
        >
          {row.kind === "stock" ? (
            <>
              <PackagePlus className="mr-1.5 h-4 w-4" />
              Registrar compra
            </>
          ) : (
            <>
              <Wrench className="mr-1.5 h-4 w-4" />
              Registrar servicio
            </>
          )}
        </Button>
      ),
    },
  ];

  const productColumns: Column<FluidProduct>[] = [
    {
      key: "name",
      header: "Producto",
      render: (_, item) => (
        <TwoLineCell
          primary={item.name || item.description || item.code}
          secondary={`${item.code} · ${FLUID_TYPE_LABELS[item.fluid_type]}`}
        />
      ),
      sortValue: (item) => item.name || item.description || item.code,
    },
    {
      key: "stock_quantity",
      header: "Stock",
      render: (_, item) => {
        const tone = getStockTone(item);
        return (
          <div className="space-y-1">
            <p className="text-gray-900">{withUnit(item.stock_quantity, item.unit)}</p>
            {tone ? (
              <Badge variant="outline" className={getAlertToneBadgeClass(tone)}>
                {tone === "critical" ? "Sin stock" : "Stock bajo"}
              </Badge>
            ) : null}
          </div>
        );
      },
      sortValue: (item) => item.stock_quantity,
    },
    {
      key: "min_stock_quantity",
      header: "Mínimo",
      render: (_, item) => withUnit(item.min_stock_quantity, item.unit),
      sortValue: (item) => item.min_stock_quantity,
    },
    { key: "actions", header: "Acciones", sortable: false },
  ];

  const ruleColumns: Column<FluidRule>[] = [
    {
      key: "vehicle_plate",
      header: "Unidad",
      render: (_, item) => (
        <TwoLineCell primary={getPlate(item.vehicle_id, item.vehicle_plate)} secondary={FLUID_TYPE_LABELS[item.fluid_type]} />
      ),
      sortValue: (item) => getPlate(item.vehicle_id, item.vehicle_plate),
    },
    {
      key: "product_code",
      header: "Producto",
      render: (_, item) => item.product_code || productById.get(item.product_id || "")?.code || "Sin producto fijo",
    },
    {
      key: "interval_km",
      header: "Cambio cada",
      sortable: false,
      render: (_, item) =>
        [
          item.interval_km ? `${formatNumber(item.interval_km)} km` : null,
          item.interval_days ? `${formatNumber(item.interval_days)} días` : null,
        ]
          .filter(Boolean)
          .join(" o ") || "-",
    },
    {
      key: "capacity_liters",
      header: "Capacidad",
      render: (value: number) => `${formatNumber(value)} L`,
      sortValue: (item) => item.capacity_liters,
    },
    { key: "actions", header: "Acciones", sortable: false },
  ];

  const serviceColumns: Column<FluidService>[] = [
    {
      key: "serviced_at",
      header: "Fecha",
      render: (value: string | undefined, item) => formatDate(value || item.created_at),
      sortValue: (item) => item.serviced_at || item.created_at,
    },
    {
      key: "vehicle_plate",
      header: "Unidad",
      render: (_, item) => getPlate(item.vehicle_id, item.vehicle_plate),
    },
    {
      key: "product_code",
      header: "Fluido",
      render: (_, item) => (
        <TwoLineCell primary={FLUID_TYPE_LABELS[item.fluid_type]} secondary={getProductCode(item.product_id, item.product_code)} />
      ),
    },
    {
      key: "quantity",
      header: "Cantidad",
      render: (value: number) => `${formatNumber(value)} L`,
      sortValue: (item) => item.quantity,
    },
    {
      key: "odometer_km",
      header: "Odómetro",
      render: (value: number | undefined | null) =>
        value === undefined || value === null ? "-" : `${formatNumber(value)} km`,
      sortValue: (item) => item.odometer_km ?? 0,
    },
  ];

  const movementColumns: Column<FluidMovement>[] = [
    {
      key: "moved_at",
      header: "Fecha",
      render: (value: string | undefined, item) => formatDate(value || item.created_at),
      sortValue: (item) => item.moved_at || item.created_at,
    },
    {
      key: "product_code",
      header: "Producto",
      render: (_, item) => getProductCode(item.product_id, item.product_code),
    },
    {
      key: "movement_type",
      header: "Movimiento",
      render: (value: FluidMovementType) => MOVEMENT_LABELS[value] ?? value,
    },
    {
      key: "quantity",
      header: "Cantidad",
      render: (value: number, item) => {
        const isInbound = INBOUND_MOVEMENTS.has(item.movement_type);
        return (
          <span className={isInbound ? "font-medium text-emerald-700" : "font-medium text-gray-700"}>
            {isInbound ? "+" : "−"}
            {formatNumber(Math.abs(value))}
          </span>
        );
      },
      sortValue: (item) => item.quantity,
    },
    {
      key: "stock_after",
      header: "Stock resultante",
      render: (value: number | null | undefined) => formatNumber(value),
      sortValue: (item) => item.stock_after ?? -1,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Fluidos"
        description="Servicios de fluidos por unidad, inventario de productos y alertas."
        actions={
          <Button variant="outline" onClick={() => void loadData(true)} disabled={isRefreshing || isLoadingData}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        }
      />

      <AlertSummaryBanner
        criticalCount={criticalAlerts.length}
        warningCount={warningCount}
        critical={{
          title: `${criticalAlerts.length} ${pluralize(criticalAlerts.length, "alerta crítica", "alertas críticas")}`,
          description: `${criticalDescription ? `${criticalDescription}. ` : ""}${
            warningCount > 0 ? `Además, ${warningCount} por atender pronto.` : ""
          }`.trim(),
        }}
        warning={{
          title: `${warningCount} ${pluralize(warningCount, "alerta", "alertas")} por atender pronto`,
          description: "Servicios próximos o productos con stock bajo.",
        }}
        ok={{
          title: "Fluidos al día",
          description: "No hay servicios vencidos ni productos con stock bajo.",
        }}
        isLoading={isLoadingData && alerts.length === 0}
        loadingText="Revisando servicios e inventario de fluidos..."
        hasError={hasAlertsError}
        onShowAlerts={activeTab !== "alertas" ? showAlertsTab : undefined}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-2">
          <TabsTrigger value="alertas" className="gap-2">
            Alertas
            <AlertCountBadge criticalCount={criticalAlerts.length} warningCount={warningCount} />
          </TabsTrigger>
          <TabsTrigger value="unidades">Por unidad</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
        </TabsList>

        <TabsContent value="alertas" className="space-y-4">
          <FilterPanel
            title="Filtros"
            activeCount={countActiveFilters(Object.values(alertFilters))}
            onClear={() => setAlertFilters(EMPTY_ALERT_FILTERS)}
            advanced={
              <FilterSelect
                id="fluid-alert-kind"
                label="Tipo"
                value={alertFilters.kind}
                onChange={(value) => setAlertFilters((prev) => ({ ...prev, kind: value }))}
                options={ALERT_KIND_OPTIONS}
              />
            }
          >
            <FilterSelect
              id="fluid-alert-tone"
              label="Estado"
              value={alertFilters.tone}
              onChange={(value) => setAlertFilters((prev) => ({ ...prev, tone: value }))}
              options={ALERT_TONE_OPTIONS}
              allLabel="Todas"
            />
          </FilterPanel>

          <DataTable
            data={alertRows}
            columns={alertColumns}
            title="Alertas de servicio y stock"
            hideAddButton
            isLoading={isLoadingData}
            searchFields={["vehicle_plate", "product_code", "product_name"]}
            searchAccessor={(row) =>
              `${row.view.label} ${row.view.detail} ${row.fluid_type ? FLUID_TYPE_LABELS[row.fluid_type] : ""}`
            }
            searchPlaceholder="Buscar por unidad, producto o fluido..."
            defaultSort={{ key: "severity", direction: "asc" }}
            initialPageSize={20}
          />
        </TabsContent>

        <TabsContent value="unidades" className="space-y-4">
          <SectionSwitch<UnitsView>
            aria-label="Vista por unidad"
            value={unitsView}
            onChange={setUnitsView}
            options={[
              { value: "services", label: "Servicios", count: services.length },
              { value: "rules", label: "Reglas de cambio", count: rules.length },
            ]}
          />

          {unitsView === "services" ? (
            <DataTable
              data={services}
              columns={serviceColumns}
              title="Servicios realizados"
              addButtonText="Registrar consumo"
              onAdd={() => openServiceModal()}
              isLoading={isLoadingData}
              searchFields={["vehicle_plate", "product_code", "fluid_type", "notes"]}
              searchAccessor={(item) => FLUID_TYPE_LABELS[item.fluid_type]}
              searchPlaceholder="Buscar por unidad, producto o fluido..."
              defaultSort={{ key: "serviced_at", direction: "desc" }}
              initialPageSize={20}
            />
          ) : (
            <DataTable
              data={rules}
              columns={ruleColumns}
              title="Reglas de cambio"
              addButtonText="Nueva regla"
              onAdd={openNewRuleModal}
              onEdit={openEditRuleModal}
              onDelete={handleDeleteRule}
              isLoading={isLoadingData}
              searchFields={["vehicle_plate", "fluid_type", "product_code", "notes"]}
              searchAccessor={(item) => FLUID_TYPE_LABELS[item.fluid_type]}
              searchPlaceholder="Buscar por unidad, fluido o producto..."
              defaultSort={{ key: "vehicle_plate", direction: "asc" }}
              initialPageSize={20}
            />
          )}
        </TabsContent>

        <TabsContent value="inventario" className="space-y-4">
          <SectionSwitch<InventoryView>
            aria-label="Vista de inventario"
            value={inventoryView}
            onChange={setInventoryView}
            options={[
              { value: "products", label: "Productos", count: products.length },
              { value: "movements", label: "Movimientos", count: movements.length },
            ]}
          />

          {inventoryView === "products" ? (
            <DataTable
              data={products}
              columns={productColumns}
              title="Productos"
              addButtonText="Nuevo producto"
              onAdd={openNewProductModal}
              onEdit={openEditProductModal}
              onDelete={handleDeleteProduct}
              isLoading={isLoadingData}
              searchFields={["code", "name", "description", "fluid_type", "notes"]}
              searchAccessor={(item) => FLUID_TYPE_LABELS[item.fluid_type]}
              searchPlaceholder="Buscar por código, nombre o fluido..."
              defaultSort={{ key: "name", direction: "asc" }}
              initialPageSize={20}
            />
          ) : (
            <DataTable
              data={movements}
              columns={movementColumns}
              title="Movimientos de inventario"
              addButtonText="Registrar movimiento"
              onAdd={() => openMovementModal()}
              isLoading={isLoadingData}
              searchFields={["product_code", "movement_type", "notes", "reference"]}
              searchAccessor={(item) => MOVEMENT_LABELS[item.movement_type] ?? ""}
              searchPlaceholder="Buscar por producto, movimiento o referencia..."
              defaultSort={{ key: "moved_at", direction: "desc" }}
              initialPageSize={20}
            />
          )}
        </TabsContent>
      </Tabs>

      <FormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? "Editar producto de fluido" : "Nuevo producto de fluido"}
      >
        <FluidProductForm
          initialValues={editingProduct ? mapProductToFormValues(editingProduct) : DEFAULT_PRODUCT_FORM}
          isEditing={Boolean(editingProduct)}
          isSaving={isSavingProduct}
          onSubmit={handleSubmitProduct}
          onCancel={() => setIsProductModalOpen(false)}
        />
      </FormModal>

      <FormModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRule ? "Editar regla de fluido" : "Nueva regla de fluido"}
      >
        <FluidRuleForm
          initialValues={editingRule ? mapRuleToFormValues(editingRule, vehicles) : DEFAULT_RULE_FORM}
          vehicles={vehicles}
          products={products}
          isEditing={Boolean(editingRule)}
          isSaving={isSavingRule}
          onSubmit={handleSubmitRule}
          onCancel={() => setIsRuleModalOpen(false)}
        />
      </FormModal>

      <FormModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title="Registrar consumo"
      >
        <RegisterConsumptionForm
          vehicles={vehicles}
          fluidProducts={products}
          initialVehicleId={serviceTarget?.vehicleId}
          initialProductId={serviceTarget?.productId}
          lastOdometerByVehicleId={lastOdometerByVehicleId}
          defaultKind="fluid"
          onSubmitFuel={handleRegisterFuelLog}
          onSubmitFluid={handleRegisterFluidService}
          onCancel={() => setIsServiceModalOpen(false)}
        />
      </FormModal>

      <FormModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title="Registrar movimiento de inventario"
      >
        <FluidMovementForm
          products={products}
          initialProductId={movementProductId}
          isSaving={isSavingMovement}
          onSubmit={handleSubmitMovement}
          onCancel={() => setIsMovementModalOpen(false)}
        />
      </FormModal>
    </div>
  );
}
