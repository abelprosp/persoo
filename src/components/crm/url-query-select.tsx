"use client";

import { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Opt = { value: string; label: string };

function UrlQuerySelectInner({
  param,
  options,
  placeholder,
  className,
  allLabel,
}: {
  param: string;
  options: Opt[];
  placeholder?: string;
  className?: string;
  allLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(param);
  const value =
    raw && options.some((o) => o.value === raw) ? raw : options[0]?.value ?? "all";

  const setValue = useCallback(
    (v: string) => {
      const next = new URLSearchParams(searchParams.toString());
      const first = options[0]?.value;
      if (!v || v === first) next.delete(param);
      else next.set(param, v);
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams, param, options]
  );

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v == null) return;
        setValue(v);
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder ?? allLabel} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function UrlQuerySelect(props: {
  param: string;
  options: Opt[];
  placeholder?: string;
  className?: string;
  allLabel?: string;
}) {
  return (
    <Suspense
      fallback={
        <div
          className={props.className ?? "h-9 w-[160px] animate-pulse rounded-md bg-muted"}
        />
      }
    >
      <UrlQuerySelectInner {...props} />
    </Suspense>
  );
}
