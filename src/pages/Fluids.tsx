import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { FormModal } from "@/components/shared/FormModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";
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
  FluidType,
  UpdateFluidProductPayload,
  UpdateFluidRulePayload,
  Vehicle,
} from "@/types";
import { FluidsApiError, fluidsApi } from "@/services/fluidsApi";
import {
  FLUID_TYPE_LABELS,
  FLUID_TYPE_OPTIONS,
  MOVEMENT_LABELS,
  formatDate,
  formatNumber,
  parseNumber,
  toDateOnlyLocalValue,
} from "@/components/fluids/fluidConstants";
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
import {
  Activity,
  AlertTriangle,
  Droplets,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  Wrench,
} from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

type TabKey = "products" | "rules" | "services" | "movements" | "alerts";



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

  const [activeTab, setActiveTab] = useState<TabKey>("products");

  const [products, setProducts] = useState<FluidProduct[]>([]);
  const [rules, setRules] = useState<FluidRule[]>([]);
  const [services, setServices] = useState<FluidService[]>([]);
  const [movements, setMovements] = useState<FluidMovement[]>([]);
  const [alerts, setAlerts] = useState<FluidAlert[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<FluidProduct | null>(null);
  const [editingRule, setEditingRule] = useState<FluidRule | null>(null);

  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isSavingService, setIsSavingService] = useState(false);
  const [isSavingMovement, setIsSavingMovement] = useState(false);

  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  );

  const loadVehicles = useCallback(async (): Promise<Vehicle[]> => {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/vehicles/`);
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

  const lowStockCount = useMemo(
    () => products.filter((product) => product.stock_quantity <= product.min_stock_quantity).length,
    [products]
  );

  const criticalAlerts = useMemo(
    () => alerts.filter((alert) => alert.severity === "critical").length,
    [alerts]
  );

  const serviceAlertsCount = useMemo(
    () => alerts.filter((alert) => alert.kind === "service").length,
    [alerts]
  );

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
    if (!confirm(`¿Eliminar el producto ${product.code}?`)) return;

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
    if (!confirm("¿Eliminar esta regla de fluido?")) return;

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

  const productColumns: Column<FluidProduct>[] = [
    { key: "code", header: "Código" },
    {
      key: "fluid_type",
      header: "Tipo",
      render: (value: FluidType) => FLUID_TYPE_LABELS[value],
    },
    {
      key: "name",
      header: "Nombre",
      render: (value: string | undefined, item) => value || item.description || "-",
    },
    {
      key: "stock_quantity",
      header: "Stock",
      render: (value: number) => formatNumber(value),
      sortValue: (item) => item.stock_quantity,
    },
    {
      key: "min_stock_quantity",
      header: "Mínimo",
      render: (value: number) => formatNumber(value),
      sortValue: (item) => item.min_stock_quantity,
    },
    {
      key: "actions",
      header: "Acciones",
      sortable: false,
      render: (_, item) => {
        const isLowStock = item.stock_quantity <= item.min_stock_quantity;
        return (
          <div className="flex items-center gap-2">
            {isLowStock ? (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">Stock bajo</Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">OK</Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => openEditProductModal(item)}>
              Editar
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => handleDeleteProduct(item)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const ruleColumns: Column<FluidRule>[] = [
    {
      key: "vehicle_plate",
      header: "Unidad",
      render: (_, item) => item.vehicle_plate || vehicleById.get(item.vehicle_id || "")?.plate_number || "-",
      sortValue: (item) => item.vehicle_plate || vehicleById.get(item.vehicle_id || "")?.plate_number || "",
    },
    {
      key: "fluid_type",
      header: "Tipo",
      render: (value: FluidType) => FLUID_TYPE_LABELS[value],
    },
    {
      key: "product_code",
      header: "Producto",
      render: (_, item) => {
        const product = products.find((entry) => entry.id === item.product_id);
        return item.product_code || product?.code || "Sin producto fijo";
      },
    },
    {
      key: "capacity_liters",
      header: "Capacidad (L)",
      render: (value: number) => formatNumber(value),
      sortValue: (item) => item.capacity_liters,
    },
    {
      key: "interval_km",
      header: "Intervalos",
      sortable: false,
      render: (_, item) => {
        const km = item.interval_km ? `${formatNumber(item.interval_km)} km` : "-";
        const days = item.interval_days ? `${formatNumber(item.interval_days)} días` : "-";
        return `${km} / ${days}`;
      },
    },
    {
      key: "next_due_km",
      header: "Próximo servicio",
      sortable: false,
      render: (_, item) => {
        const dueKm = item.next_due_km ? `${formatNumber(item.next_due_km)} km` : "-";
        const dueDate = item.next_due_date ? formatDate(item.next_due_date) : "-";
        return `${dueKm} · ${dueDate}`;
      },
    },
    {
      key: "actions",
      header: "Acciones",
      sortable: false,
      render: (_, item) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => openEditRuleModal(item)}>
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-300"
            onClick={() => handleDeleteRule(item)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
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
      render: (_, item) => item.vehicle_plate || vehicleById.get(item.vehicle_id || "")?.plate_number || "-",
    },
    {
      key: "product_code",
      header: "Producto",
      render: (_, item) => {
        const product = products.find((entry) => entry.id === item.product_id);
        return item.product_code || product?.code || "-";
      },
    },
    {
      key: "fluid_type",
      header: "Tipo",
      render: (value: FluidType) => FLUID_TYPE_LABELS[value],
    },
    {
      key: "quantity",
      header: "Cantidad (L)",
      render: (value: number) => formatNumber(value),
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
      render: (_, item) => {
        const product = products.find((entry) => entry.id === item.product_id);
        return item.product_code || product?.code || "-";
      },
    },
    {
      key: "movement_type",
      header: "Tipo",
      render: (value: FluidMovementType) => MOVEMENT_LABELS[value] ?? value,
    },
    {
      key: "quantity",
      header: "Cantidad",
      render: (value: number) => formatNumber(value),
      sortValue: (item) => item.quantity,
    },
    {
      key: "stock_after",
      header: "Stock resultante",
      render: (value: number | null | undefined) => formatNumber(value),
      sortValue: (item) => item.stock_after ?? -1,
    },
    {
      key: "notes",
      header: "Notas",
      render: (value: string | undefined) => value || "-",
      sortable: false,
    },
  ];

  const alertColumns: Column<FluidAlert>[] = [
    {
      key: "kind",
      header: "Tipo alerta",
      render: (value: "stock" | "service") =>
        value === "stock" ? "Inventario" : "Servicio",
      sortValue: (item) => item.kind,
    },
    {
      key: "severity",
      header: "Severidad",
      render: (value: string) => {
        if (value === "critical") {
          return <Badge className="bg-red-100 text-red-700 border-red-200">Crítica</Badge>;
        }
        if (value === "warning") {
          return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Advertencia</Badge>;
        }
        return <Badge className="bg-sky-100 text-sky-700 border-sky-200">Info</Badge>;
      },
      sortValue: (item) => item.severity,
    },
    {
      key: "fluid_type",
      header: "Fluido",
      render: (value: FluidType | undefined) => (value ? FLUID_TYPE_LABELS[value] : "-") ,
    },
    {
      key: "vehicle_plate",
      header: "Unidad",
      render: (value: string | undefined) => value || "-",
    },
    {
      key: "product_code",
      header: "Producto",
      render: (value: string | undefined) => value || "-",
    },
    {
      key: "message",
      header: "Detalle",
      render: (value: string) => value,
      sortable: false,
    },
  ];

  const totalEntities = products.length + rules.length + services.length + movements.length;

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">Control de Fluidos</h1>
          <p className="text-gray-600 mt-1">
            Productos, reglas por unidad, servicios, movimientos y alertas del sistema de fluidos.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void loadData(true)}
          disabled={isRefreshing || isLoadingData}
          className="w-full lg:w-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Registros cargados</p>
              <p className="text-2xl font-bold text-primary-900">{totalEntities}</p>
            </div>
            <Droplets className="w-6 h-6 text-primary" />
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-700">Stock bajo</p>
              <p className="text-2xl font-bold text-amber-800">{lowStockCount}</p>
            </div>
            <Package className="w-6 h-6 text-amber-700" />
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Alertas críticas</p>
              <p className="text-2xl font-bold text-red-800">{criticalAlerts}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-red-700" />
          </CardContent>
        </Card>

        <Card className="border-sky-200 bg-sky-50/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-sky-700">Alertas de servicio</p>
              <p className="text-2xl font-bold text-sky-800">{serviceAlertsCount}</p>
            </div>
            <Wrench className="w-6 h-6 text-sky-700" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="space-y-4">
        <TabsList className="grid h-auto grid-cols-2 lg:grid-cols-5 w-full lg:w-auto">
          <TabsTrigger value="products" className="gap-2">Productos <Badge>{products.length}</Badge></TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">Reglas <Badge>{rules.length}</Badge></TabsTrigger>
          <TabsTrigger value="services" className="gap-2">Servicios <Badge>{services.length}</Badge></TabsTrigger>
          <TabsTrigger value="movements" className="gap-2">Movimientos <Badge>{movements.length}</Badge></TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">Alertas <Badge>{alerts.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle>Catálogo e inventario de fluidos</CardTitle>
                <Button onClick={openNewProductModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo producto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={products}
                columns={productColumns}
                title=""
                isLoading={isLoadingData}
                hideAddButton
                searchFields={["code", "name", "description", "fluid_type", "notes"]}
                searchPlaceholder="Buscar por código, tipo o descripción..."
                defaultSort={{ key: "code", direction: "asc" }}
                initialPageSize={20}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle>Reglas por vehículo</CardTitle>
                <Button onClick={openNewRuleModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva regla
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={rules}
                columns={ruleColumns}
                title=""
                isLoading={isLoadingData}
                hideAddButton
                searchFields={["vehicle_plate", "fluid_type", "product_code", "notes"]}
                searchPlaceholder="Buscar por unidad, tipo o producto..."
                defaultSort={{ key: "created_at", direction: "desc" }}
                initialPageSize={20}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle>Servicios realizados</CardTitle>
                <Button onClick={() => setIsServiceModalOpen(true)}>
                  <Activity className="w-4 h-4 mr-2" />
                  Registrar servicio
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={services}
                columns={serviceColumns}
                title=""
                isLoading={isLoadingData}
                hideAddButton
                searchFields={["vehicle_plate", "product_code", "fluid_type", "notes"]}
                searchPlaceholder="Buscar por unidad, producto o tipo..."
                defaultSort={{ key: "created_at", direction: "desc" }}
                initialPageSize={20}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle>Movimientos de inventario</CardTitle>
                <Button onClick={() => setIsMovementModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo movimiento
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={movements}
                columns={movementColumns}
                title=""
                isLoading={isLoadingData}
                hideAddButton
                searchFields={["product_code", "movement_type", "notes", "reference"]}
                searchPlaceholder="Buscar por producto, tipo o referencia..."
                defaultSort={{ key: "created_at", direction: "desc" }}
                initialPageSize={20}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas de stock y servicio</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={alerts}
                columns={alertColumns}
                title=""
                isLoading={isLoadingData}
                hideAddButton
                searchFields={["kind", "severity", "fluid_type", "vehicle_plate", "product_code", "message"]}
                searchPlaceholder="Buscar alertas..."
                defaultSort={{ key: "severity", direction: "desc" }}
                initialPageSize={20}
              />
            </CardContent>
          </Card>
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
          isSaving={isSavingMovement}
          onSubmit={handleSubmitMovement}
          onCancel={() => setIsMovementModalOpen(false)}
        />
      </FormModal>
    </div>
  );
}
