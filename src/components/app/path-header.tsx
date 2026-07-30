import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Icon tile + title + optional description, shared by the add-product paths and
 * the My Products store-import cards so the tile sizing can't drift apart. */
export function PathHeader({
  icon: Icon,
  title,
  description,
  tone = "brand",
  centered = false,
  descriptionClassName,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: "brand" | "accent";
  centered?: boolean;
  descriptionClassName?: string;
}) {
  return (
    <div className={cn("flex gap-3", centered && "flex-col items-center text-center")}>
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          tone === "brand" ? "bg-brand-500 text-white" : "bg-accent text-accent-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {description && (
          <p
            className={cn(
              "mt-1 text-sm text-muted-foreground",
              centered && "mx-auto max-w-xl",
              descriptionClassName,
            )}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
