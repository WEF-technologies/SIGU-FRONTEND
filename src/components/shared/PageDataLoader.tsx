import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

interface PageDataLoaderProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function PageDataLoader({ title, description, icon }: PageDataLoaderProps) {
  return (
    <Card className="p-6 border-primary/20 bg-gradient-to-r from-primary/5 via-white to-secondary-light/50">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-full border-4 border-primary/25 animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">
            {icon ?? <Loader2 className="w-7 h-7 animate-spin" />}
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-primary-900">{title}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>

        <div className="w-full max-w-3xl space-y-2 pt-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </Card>
  );
}
