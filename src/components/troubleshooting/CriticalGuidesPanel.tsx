import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCategory } from "@/components/troubleshooting/guideUtils";
import { TroubleshootingGuide } from "@/types";
import { AlertTriangle } from "lucide-react";

interface CriticalGuidesPanelProps {
  guides: TroubleshootingGuide[];
  hasMore: boolean;
  onSelect: (guide: TroubleshootingGuide) => void;
}

/**
 * Acceso directo a las fallas criticas activas. Se alimenta de su propia
 * consulta, no del listado filtrado: si alguien esta filtrando por "frenos", las
 * criticas de motor deben seguir a un clic de distancia.
 */
export function CriticalGuidesPanel({ guides, hasMore, onSelect }: CriticalGuidesPanelProps) {
  if (guides.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-xl text-primary-900">Fallas criticas</CardTitle>
          <p className="text-sm text-secondary-dark">
            Guias activas que dejan la unidad fuera de servicio.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-red-200 bg-red-50 text-red-700">
          {hasMore ? `${guides.length}+ criticas` : `${guides.length} criticas`}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {guides.map((guide) => (
            <button
              key={guide.id}
              type="button"
              onClick={() => onSelect(guide)}
              className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-white p-4 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
                  <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                    Requiere taller
                  </Badge>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
