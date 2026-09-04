import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TroubleshootingGuide } from "@/types";
import { AlertTriangle, BookOpen, LifeBuoy, Wrench } from "lucide-react";

interface GuideSummaryCardsProps {
  guides: TroubleshootingGuide[];
}

/**
 * Conteos de la pagina que se esta viendo. El listado del backend no devuelve
 * totales, asi que las cifras se declaran acotadas a los resultados en pantalla
 * en vez de aparentar ser del manual completo.
 */
export function GuideSummaryCards({ guides }: GuideSummaryCardsProps) {
  const cards = useMemo(
    () => [
      { title: "Fallas", value: guides.length, icon: BookOpen },
      {
        title: "Activas",
        value: guides.filter((guide) => guide.status === "activa").length,
        icon: LifeBuoy,
      },
      {
        title: "Criticas",
        value: guides.filter((guide) => guide.severity === "critica").length,
        icon: AlertTriangle,
      },
      {
        title: "Requieren taller",
        value: guides.filter((guide) => guide.requires_workshop).length,
        icon: Wrench,
      },
    ],
    [guides]
  );

  return (
    <section className="space-y-3">
      <p className="text-sm text-secondary-dark">
        Resumen de las fallas mostradas en esta pagina.
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
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
    </section>
  );
}
