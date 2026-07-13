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

const FLUID_TYPE_OPTIONS: Array<{ value: FluidType; label: string }> = [
  { value: "engine_oil", label: "Aceite de motor" },
  { value: "transmission_oil", label: "Aceite de transmisión" },
  { value: "brake_fluid", label: "Líquido de frenos" },
  { value: "hydraulic_oil", label: "Aceite hidráulico" },
  { value: "coolant", label: "Refrigerante" },
  { value: "other", label: "Otro" },
];

const MOVEMENT_OPTIONS: Array<{
  value: Extract<FluidMovementType, "purchase" | "adjustment_in" | "adjustment_out">;
  label: string;
}> = [
  { value: "purchase", label: "Compra" },
  { value: "adjustment_in", label: "Ajuste entrada" },
  { value: "adjustment_out", label: "Ajuste salida" },
];

const FLUID_TYPE_LABELS: Record<FluidType, string> = {
  engine_oil: "Aceite motor",
  transmission_oil: "Aceite transmisión",
  brake_fluid: "Líquido frenos",
  hydraulic_oil: "Aceite hidráulico",
  coolant: "Refrigerante",
  other: "Otro",
};

const MOVEMENT_LABELS: Record<FluidMovementType, string> = {
  opening_balance: "Saldo inicial",
  purchase: "Compra",
  adjustment_in: "Ajuste entrada",
  adjustment_out: "Ajuste salida",
  service_use: "Uso por servicio",
};

interface ProductFormState {
  code: string;
  fluid_type: FluidType;
  name: string;
  description: string;
  stock_quantity: string;
  min_stock_quantity: string;
  unit: string;
  notes: string;
}

interface RuleFormState {
  vehicle_id: string;
  fluid_type: FluidType;
  product_id: string;
  capacity_liters: string;
  interval_km: string;
  interval_days: string;
  notes: string;
}

interface ServiceFormState {
  vehicle_id: string;
  product_id: string;
  quantity: string;
  odometer_km: string;
  serviced_at: string;
  notes: string;
}

interface MovementFormState {
  product_id: string;
  movement_type: Extract<FluidMovementType, "purchase" | "adjustment_in" | "adjustment_out">;
  quantity: string;
  occurred_at: string;
  reference: string;
  notes: string;
}

const toDateTimeLocalValue = (date: Date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const DEFAULT_PRODUCT_FORM: ProductFormState = {
  code: "",
  fluid_type: "engine_oil",
  name: "",
  description: "",
  stock_quantity: "",
  min_stock_quantity: "",
  unit: "litros",
  notes: "",
};

const DEFAULT_RULE_FORM: RuleFormState = {
  vehicle_id: "",
  fluid_type: "engine_oil",
  product_id: "",
  capacity_liters: "",
  interval_km: "",
  interval_days: "",
  notes: "",
};

const DEFAULT_SERVICE_FORM: ServiceFormState = {
  vehicle_id: "",
  product_id: "",
  quantity: "",
  odometer_km: "",
  serviced_at: new Date().toISOString().split("T")[0],
  notes: "",
};

const DEFAULT_MOVEMENT_FORM: MovementFormState = {
  product_id: "",
  movement_type: "purchase",
  quantity: "",
  occurred_at: toDateTimeLocalValue(),
  reference: "",
  notes: "",
};

const parseNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  });
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

  const [productForm, setProductForm] = useState<ProductFormState>(DEFAULT_PRODUCT_FORM);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(DEFAULT_RULE_FORM);
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(DEFAULT_SERVICE_FORM);
  const [movementForm, setMovementForm] = useState<MovementFormState>(DEFAULT_MOVEMENT_FORM);

  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isSavingService, setIsSavingService] = useState(false);
  const [isSavingMovement, setIsSavingMovement] = useState(false);

  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  );

  const productsByFluidType = useMemo(() => {
    const grouped = new Map<FluidType, FluidProduct[]>();
    FLUID_TYPE_OPTIONS.forEach((option) => grouped.set(option.value, []));

    products.forEach((product) => {
      const current = grouped.get(product.fluid_type) ?? [];
      current.push(product);
      grouped.set(product.fluid_type, current);
    });

    grouped.forEach((value) => {
      value.sort((a, b) => a.code.localeCompare(b.code, "es", { sensitivity: "base" }));
    });

    return grouped;
  }, [products]);

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
    setProductForm(DEFAULT_PRODUCT_FORM);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: FluidProduct) => {
    setEditingProduct(product);
    setProductForm({
      code: product.code,
      fluid_type: product.fluid_type,
      name: product.name ?? "",
      description: product.description ?? "",
      stock_quantity: product.stock_quantity.toString(),
      min_stock_quantity: product.min_stock_quantity.toString(),
      unit: product.unit ?? "",
      notes: product.notes ?? "",
    });
    setIsProductModalOpen(true);
  };

  const openNewRuleModal = () => {
    setEditingRule(null);
    setRuleForm(DEFAULT_RULE_FORM);
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: FluidRule) => {
    const matchedVehicleId =
      rule.vehicle_id ??
      vehicles.find((vehicle) => vehicle.plate_number === rule.vehicle_plate)?.id ??
      "";

    setEditingRule(rule);
    setRuleForm({
      vehicle_id: matchedVehicleId,
      fluid_type: rule.fluid_type,
      product_id: rule.product_id ?? "",
      capacity_liters: rule.capacity_liters ? String(rule.capacity_liters) : "",
      interval_km: rule.interval_km ? String(rule.interval_km) : "",
      interval_days: rule.interval_days ? String(rule.interval_days) : "",
      notes: rule.notes ?? "",
    });
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

  const handleSubmitProduct = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!productForm.code.trim()) {
      toast({ title: "Código requerido", description: "Ingresa el código del producto.", variant: "destructive" });
      return;
    }

    const stockQuantity = parseNumber(productForm.stock_quantity);
    const minStockQuantity = parseNumber(productForm.min_stock_quantity);

    if (stockQuantity !== undefined && stockQuantity < 0) {
      toast({ title: "Stock inválido", description: "El stock no puede ser negativo.", variant: "destructive" });
      return;
    }

    if (minStockQuantity !== undefined && minStockQuantity < 0) {
      toast({ title: "Mínimo inválido", description: "El stock mínimo no puede ser negativo.", variant: "destructive" });
      return;
    }

    const specification =
      productForm.description.trim() || productForm.name.trim() || productForm.code.trim().toUpperCase();

    const payload: CreateFluidProductPayload | UpdateFluidProductPayload = {
      code: productForm.code.trim().toUpperCase(),
      fluid_type: productForm.fluid_type,
      ...(specification ? { specification } : {}),
      ...(productForm.name.trim() ? { name: productForm.name.trim() } : {}),
      ...(productForm.description.trim() ? { description: productForm.description.trim() } : {}),
      ...(stockQuantity !== undefined ? { stock_quantity: stockQuantity } : {}),
      ...(minStockQuantity !== undefined ? { min_stock_quantity: minStockQuantity } : {}),
      ...(productForm.unit.trim() ? { unit: productForm.unit.trim() } : {}),
      ...(productForm.notes.trim() ? { notes: productForm.notes.trim() } : {}),
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
      setProductForm(DEFAULT_PRODUCT_FORM);
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

  const handleSubmitRule = async (event: React.FormEvent) => {
    event.preventDefault();

    const capacityLiters = parseNumber(ruleForm.capacity_liters);
    const intervalKm = parseNumber(ruleForm.interval_km);
    const intervalDays = parseNumber(ruleForm.interval_days);

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

    const selectedVehicle = vehicleById.get(ruleForm.vehicle_id);
    if (!editingRule && !selectedVehicle) {
      toast({
        title: "Unidad requerida",
        description: "Selecciona la unidad para crear la regla.",
        variant: "destructive",
      });
      return;
    }

    const createPayload: CreateFluidRulePayload = {
      fluid_type: ruleForm.fluid_type,
      capacity_liters: capacityLiters,
      ...(selectedVehicle?.id ? { vehicle_id: selectedVehicle.id } : {}),
      ...(selectedVehicle?.id ? { unit_id: selectedVehicle.id } : {}),
      ...(selectedVehicle?.plate_number ? { vehicle_plate: selectedVehicle.plate_number } : {}),
      ...(selectedVehicle?.plate_number ? { plate_number: selectedVehicle.plate_number } : {}),
      ...(ruleForm.product_id ? { product_id: ruleForm.product_id } : {}),
      ...(ruleForm.product_id ? { fluid_product_id: ruleForm.product_id } : {}),
      ...(intervalKm ? { interval_km: intervalKm } : {}),
      ...(intervalDays ? { interval_days: intervalDays } : {}),
      ...(ruleForm.notes.trim() ? { notes: ruleForm.notes.trim() } : {}),
    };

    const updatePayload: UpdateFluidRulePayload = {
      fluid_type: ruleForm.fluid_type,
      capacity_liters: capacityLiters,
      ...(ruleForm.product_id ? { product_id: ruleForm.product_id } : {}),
      ...(ruleForm.product_id ? { fluid_product_id: ruleForm.product_id } : {}),
      ...(intervalKm ? { interval_km: intervalKm } : {}),
      ...(intervalDays ? { interval_days: intervalDays } : {}),
      ...(ruleForm.notes.trim() ? { notes: ruleForm.notes.trim() } : {}),
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
      setRuleForm(DEFAULT_RULE_FORM);
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

  const handleSubmitService = async (event: React.FormEvent) => {
    event.preventDefault();

    const selectedVehicle = vehicleById.get(serviceForm.vehicle_id);
    const quantity = parseNumber(serviceForm.quantity);
    const odometerKm = parseNumber(serviceForm.odometer_km);

    if (!selectedVehicle) {
      toast({ title: "Unidad requerida", description: "Selecciona una unidad.", variant: "destructive" });
      return;
    }

    if (!serviceForm.product_id) {
      toast({ title: "Producto requerido", description: "Selecciona el producto de fluido.", variant: "destructive" });
      return;
    }

    if (!quantity || quantity <= 0) {
      toast({ title: "Cantidad inválida", description: "La cantidad debe ser mayor a cero.", variant: "destructive" });
      return;
    }

    const payload: CreateFluidServicePayload = {
      vehicle_plate: selectedVehicle.plate_number,
      plate_number: selectedVehicle.plate_number,
      vehicle_id: selectedVehicle.id,
      unit_id: selectedVehicle.id,
      product_id: serviceForm.product_id,
      fluid_product_id: serviceForm.product_id,
      quantity,
      ...(odometerKm ? { odometer_km: odometerKm } : {}),
      ...(serviceForm.serviced_at ? { serviced_at: serviceForm.serviced_at } : {}),
      ...(serviceForm.serviced_at ? { service_date: serviceForm.serviced_at } : {}),
      ...(serviceForm.notes.trim() ? { notes: serviceForm.notes.trim() } : {}),
    };

    setIsSavingService(true);
    try {
      await fluidsApi.createService(authenticatedFetch, payload);
      toast({ title: "Servicio registrado", description: "Se registró el servicio de fluido." });
      setIsServiceModalOpen(false);
      setServiceForm(DEFAULT_SERVICE_FORM);
      await loadData(true);
    } catch (error) {
      toast({
        title: "Error al registrar servicio",
        description: getErrorMessage(error, "No se pudo registrar el servicio de fluido."),
        variant: "destructive",
      });
    } finally {
      setIsSavingService(false);
    }
  };

  const handleSubmitMovement = async (event: React.FormEvent) => {
    event.preventDefault();

    const quantity = parseNumber(movementForm.quantity);
    const occurredAtDate = movementForm.occurred_at ? new Date(movementForm.occurred_at) : new Date();
    const occurredAt = Number.isNaN(occurredAtDate.getTime())
      ? new Date().toISOString()
      : occurredAtDate.toISOString();

    if (!movementForm.product_id) {
      toast({ title: "Producto requerido", description: "Selecciona un producto.", variant: "destructive" });
      return;
    }

    if (!quantity || quantity <= 0) {
      toast({ title: "Cantidad inválida", description: "La cantidad debe ser mayor a cero.", variant: "destructive" });
      return;
    }

    const payload: CreateFluidMovementPayload = {
      product_id: movementForm.product_id,
      fluid_product_id: movementForm.product_id,
      movement_type: movementForm.movement_type,
      quantity,
      occurred_at: occurredAt,
      ...(movementForm.reference.trim() ? { reference: movementForm.reference.trim() } : {}),
      ...(movementForm.notes.trim() ? { notes: movementForm.notes.trim() } : {}),
    };

    setIsSavingMovement(true);
    try {
      await fluidsApi.createMovement(authenticatedFetch, payload);
      toast({ title: "Movimiento registrado", description: "Se registró el movimiento de inventario." });
      setIsMovementModalOpen(false);
      setMovementForm(DEFAULT_MOVEMENT_FORM);
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

  const filteredProductsForRule = useMemo(
    () => productsByFluidType.get(ruleForm.fluid_type) ?? [],
    [productsByFluidType, ruleForm.fluid_type]
  );

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
        <form onSubmit={handleSubmitProduct} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Código</Label>
              <Input
                value={productForm.code}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                }
                required
              />
            </div>
            <div>
              <Label>Tipo de fluido</Label>
              <Select
                value={productForm.fluid_type}
                onValueChange={(value) =>
                  setProductForm((prev) => ({ ...prev, fluid_type: value as FluidType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLUID_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Nombre</Label>
              <Input
                value={productForm.name}
                onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label>Unidad</Label>
              <Input
                value={productForm.unit}
                onChange={(event) => setProductForm((prev) => ({ ...prev, unit: event.target.value }))}
                placeholder="litros"
              />
            </div>
          </div>

          <div>
            <Label>Descripción</Label>
            <Input
              value={productForm.description}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Opcional"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Stock inicial</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={productForm.stock_quantity}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, stock_quantity: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Stock mínimo</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={productForm.min_stock_quantity}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, min_stock_quantity: event.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea
              rows={3}
              value={productForm.notes}
              onChange={(event) => setProductForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingProduct}>
              {isSavingProduct ? "Guardando..." : editingProduct ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </FormModal>

      <FormModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRule ? "Editar regla de fluido" : "Nueva regla de fluido"}
      >
        <form onSubmit={handleSubmitRule} className="space-y-4">
          {!editingRule ? (
            <div>
              <Label>Unidad</Label>
              <Select
                value={ruleForm.vehicle_id}
                onValueChange={(value) => setRuleForm((prev) => ({ ...prev, vehicle_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona unidad" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate_number} · {vehicle.brand} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Tipo de fluido</Label>
              <Select
                value={ruleForm.fluid_type}
                onValueChange={(value) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    fluid_type: value as FluidType,
                    product_id: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLUID_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Producto asociado (opcional)</Label>
              <Select
                value={ruleForm.product_id || "none"}
                onValueChange={(value) =>
                  setRuleForm((prev) => ({ ...prev, product_id: value === "none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin producto fijo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin producto fijo</SelectItem>
                  {filteredProductsForRule.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.code} · {product.name || product.description || FLUID_TYPE_LABELS[product.fluid_type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Capacidad (L)</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={ruleForm.capacity_liters}
                onChange={(event) =>
                  setRuleForm((prev) => ({ ...prev, capacity_liters: event.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label>Intervalo km</Label>
              <Input
                type="number"
                min={0}
                value={ruleForm.interval_km}
                onChange={(event) =>
                  setRuleForm((prev) => ({ ...prev, interval_km: event.target.value }))
                }
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label>Intervalo días</Label>
              <Input
                type="number"
                min={0}
                value={ruleForm.interval_days}
                onChange={(event) =>
                  setRuleForm((prev) => ({ ...prev, interval_days: event.target.value }))
                }
                placeholder="Opcional"
              />
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea
              rows={3}
              value={ruleForm.notes}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsRuleModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingRule}>
              {isSavingRule ? "Guardando..." : editingRule ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </FormModal>

      <FormModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title="Registrar servicio de fluido"
      >
        <form onSubmit={handleSubmitService} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Unidad</Label>
              <Select
                value={serviceForm.vehicle_id}
                onValueChange={(value) => setServiceForm((prev) => ({ ...prev, vehicle_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona unidad" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate_number} · {vehicle.brand} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Producto</Label>
              <Select
                value={serviceForm.product_id}
                onValueChange={(value) => setServiceForm((prev) => ({ ...prev, product_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.code} · {FLUID_TYPE_LABELS[product.fluid_type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Cantidad (L)</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={serviceForm.quantity}
                onChange={(event) => setServiceForm((prev) => ({ ...prev, quantity: event.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Odómetro (km)</Label>
              <Input
                type="number"
                min={0}
                value={serviceForm.odometer_km}
                onChange={(event) =>
                  setServiceForm((prev) => ({ ...prev, odometer_km: event.target.value }))
                }
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label>Fecha de servicio</Label>
              <Input
                type="date"
                value={serviceForm.serviced_at}
                onChange={(event) =>
                  setServiceForm((prev) => ({ ...prev, serviced_at: event.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea
              rows={3}
              value={serviceForm.notes}
              onChange={(event) => setServiceForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsServiceModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingService}>
              {isSavingService ? "Registrando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </FormModal>

      <FormModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title="Registrar movimiento de inventario"
      >
        <form onSubmit={handleSubmitMovement} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Producto</Label>
              <Select
                value={movementForm.product_id}
                onValueChange={(value) => setMovementForm((prev) => ({ ...prev, product_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.code} · {FLUID_TYPE_LABELS[product.fluid_type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de movimiento</Label>
              <Select
                value={movementForm.movement_type}
                onValueChange={(value) =>
                  setMovementForm((prev) => ({
                    ...prev,
                    movement_type: value as MovementFormState["movement_type"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={movementForm.quantity}
                onChange={(event) =>
                  setMovementForm((prev) => ({ ...prev, quantity: event.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label>Fecha y hora</Label>
              <Input
                type="datetime-local"
                value={movementForm.occurred_at}
                onChange={(event) =>
                  setMovementForm((prev) => ({ ...prev, occurred_at: event.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Referencia</Label>
              <Input
                value={movementForm.reference}
                onChange={(event) =>
                  setMovementForm((prev) => ({ ...prev, reference: event.target.value }))
                }
                placeholder="Factura, guía, ajuste, etc."
              />
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea
              rows={3}
              value={movementForm.notes}
              onChange={(event) => setMovementForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsMovementModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSavingMovement}>
              {isSavingMovement ? "Registrando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
