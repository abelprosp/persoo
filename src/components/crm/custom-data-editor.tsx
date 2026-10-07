"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CustomFieldDef } from "@/lib/ai-schema";

export function customValuesFromRow(
  row: { custom_data?: unknown },
  fields: CustomFieldDef[]
): Record<string, string> {
  const raw = row.custom_data;
  const data =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const values: Record<string, string> = {};
  for (const field of fields) {
    const value = data[field.key];
    values[field.key] = value == null ? "" : String(value);
  }
  return values;
}

export function CustomDataEditor({
  fields,
  values,
  onChange,
}: {
  fields: CustomFieldDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  if (fields.length === 0) return null;
  return (
    <div className="grid gap-2">
      {fields.map((field) => (
        <div key={field.key} className="space-y-1">
          <Label>{field.label}</Label>
          <Input
            value={values[field.key] ?? ""}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
