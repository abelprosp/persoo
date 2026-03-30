import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  total: number;
  pageSize?: number;
};

export function DataTableFooter({ total, pageSize = 20 }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 bg-white px-4 py-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-1">
        {[20, 50, 100].map((n) => (
          <Button
            key={n}
            variant="ghost"
            size="sm"
            type="button"
            className={cn(
              "h-8 min-w-10 px-2",
              n === pageSize && "bg-muted font-medium text-foreground"
            )}
          >
            {n}
          </Button>
        ))}
      </div>
      <p>
        {total} de {total}
      </p>
    </div>
  );
}
