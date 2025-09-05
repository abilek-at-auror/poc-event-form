import { Badge } from "@aurornz/lumos/Badge";
import clsx from "clsx";
import type { SectionConfig } from "../generated/events/eventFormsAPI.schemas";

interface ConditionalSectionProps {
  sectionId: string;
  config?: SectionConfig;
  children: React.ReactNode;
  className?: string;
}

export function ConditionalSection({
  sectionId,
  config,
  children,
  className
}: ConditionalSectionProps) {
  // Don't render if no config (section not enabled for this event type)
  if (!config || config.sectionId !== sectionId) {
    return null;
  }

  return (
    <div className={clsx("relative", className)}>
      {config.required && (
        <div className="absolute top-4 right-4 z-10">
          <Badge label="Required" className="text-xs bg-red-100 text-red-800" />
        </div>
      )}
      {children}
    </div>
  );
}
