import { useLocation } from "react-router-dom";
import { Hammer } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { titleFor } from "@/lib/modules";

/** Temporary page for modules scheduled in later phases of the rebuild sequence. */
export default function ModulePlaceholder() {
  const title = titleFor(useLocation().pathname);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <EmptyState icon={<Hammer size={20} />} title={`${title} is next in the rebuild`} body="This module will be rebuilt on the shared design system and connected to the existing API." />
    </div>
  );
}
