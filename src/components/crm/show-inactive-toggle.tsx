"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShowInactiveToggle() {
  return (
    <Suspense fallback={null}>
      <InactiveToggleLink />
    </Suspense>
  );
}

function InactiveToggleLink() {
  const pathname = usePathname();
  const params = useSearchParams();
  const showing = params.get("inativos") === "1";
  const next = new URLSearchParams(params.toString());
  if (showing) next.delete("inativos");
  else next.set("inativos", "1");
  const query = next.toString();
  const href = query ? `${pathname}?${query}` : pathname;

  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      {showing ? "Ver ativos" : "Ver desativados"}
    </Link>
  );
}
