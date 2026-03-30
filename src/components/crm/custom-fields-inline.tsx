import {
  type CustomFieldDef,
  formatCustomFieldValue,
  readRowCustomData,
} from "@/lib/ai-schema";

type Row = { custom_data?: unknown };

export function CustomFieldsInline({
  fields,
  row,
}: {
  fields: CustomFieldDef[];
  row: Row;
}) {
  if (fields.length === 0) return null;
  const data = readRowCustomData(row);
  return (
    <div className="mt-2 space-y-0.5 border-t border-border/40 pt-2">
      {fields.map((f) => (
        <p
          key={f.key}
          className="text-[11px] leading-tight text-muted-foreground"
        >
          <span className="font-medium text-foreground/80">{f.label}:</span>{" "}
          {formatCustomFieldValue(data[f.key], f.type)}
        </p>
      ))}
    </div>
  );
}
