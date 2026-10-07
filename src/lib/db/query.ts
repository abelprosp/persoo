import type { QueryResultRow } from "pg";
import { adminQuery, type QueryRunner } from "@/lib/db/pool";
import type { DbError, DbQuery, DbResult, ListResult, OneResult } from "@/lib/db/types";

type Filter =
  | { op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; column: string; value: unknown }
  | { op: "in"; column: string; value: unknown[] }
  | { op: "is"; column: string; value: unknown }
  | { op: "not"; column: string; operator: string; value: unknown }
  | { op: "or"; raw: string };

type SelectItem =
  | { kind: "star" }
  | { kind: "column"; name: string }
  | { kind: "embed"; table: string; columns: SelectItem[] };

type FkRef = { column: string; foreignColumn: string };

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Identificador inválido: ${name}`);
  return `"${name}"`;
}

function col(name: string): string {
  return `t.${ident(name)}`;
}

function isJsonValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (value instanceof Date) return false;
  return typeof value === "object";
}

function push(params: unknown[], value: unknown): string {
  if (isJsonValue(value)) {
    params.push(JSON.stringify(value));
    return `$${params.length}::jsonb`;
  }
  params.push(value instanceof Date ? value.toISOString() : value);
  return `$${params.length}`;
}

function toError(error: unknown): DbError {
  if (error && typeof error === "object" && "message" in error) {
    const err = error as { message: string; code?: string; detail?: string };
    return {
      message: err.message,
      code: err.code,
      details: err.detail ?? null,
    };
  }
  return { message: "Erro de base de dados", details: null };
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = normalizeValue(nested);
    }
    return out;
  }
  return value;
}

function parseSelectList(input: string): SelectItem[] {
  const source = input.trim();
  if (source === "*") return [{ kind: "star" }];
  const items: SelectItem[] = [];
  let i = 0;
  while (i < source.length) {
    while (i < source.length && /[\s,]/.test(source[i]!)) i++;
    if (i >= source.length) break;
    let name = "";
    while (i < source.length && /[a-zA-Z0-9_]/.test(source[i]!)) {
      name += source[i];
      i++;
    }
    if (!name) throw new Error(`Select inválido perto de: ${source.slice(i, i + 24)}`);
    while (i < source.length && source[i] === " ") i++;
    if (source[i] === "(") {
      const start = i + 1;
      let depth = 1;
      i++;
      while (i < source.length && depth > 0) {
        if (source[i] === "(") depth++;
        else if (source[i] === ")") depth--;
        i++;
      }
      items.push({
        kind: "embed",
        table: name,
        columns: parseSelectList(source.slice(start, i - 1)),
      });
    } else if (name === "*") {
      items.push({ kind: "star" });
    } else {
      items.push({ kind: "column", name });
    }
  }
  return items;
}

function splitCommas(input: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (const ch of input) {
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      if (current.trim()) out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function compileOrAtom(part: string, params: unknown[]): string {
  const dot = part.indexOf(".");
  if (dot <= 0) throw new Error(`Filtro or inválido: ${part}`);
  const column = part.slice(0, dot);
  const rest = part.slice(dot + 1);
  const operators = ["ilike", "like", "neq", "gte", "lte", "gt", "lt", "eq", "is", "in"];
  const operator = operators.find((op) => rest.startsWith(`${op}.`));
  if (!operator) throw new Error(`Filtro or inválido: ${part}`);
  const rawValue = rest.slice(operator.length + 1);
  if (operator === "is") {
    if (rawValue === "null") return `${col(column)} IS NULL`;
    if (rawValue === "true") return `${col(column)} IS TRUE`;
    if (rawValue === "false") return `${col(column)} IS FALSE`;
  }
  if (operator === "ilike") return `${col(column)} ILIKE ${push(params, rawValue)}`;
  if (operator === "like") return `${col(column)} LIKE ${push(params, rawValue)}`;
  if (operator === "eq") return `${col(column)} = ${push(params, rawValue)}`;
  if (operator === "neq") return `${col(column)} <> ${push(params, rawValue)}`;
  if (operator === "gt") return `${col(column)} > ${push(params, rawValue)}`;
  if (operator === "gte") return `${col(column)} >= ${push(params, rawValue)}`;
  if (operator === "lt") return `${col(column)} < ${push(params, rawValue)}`;
  if (operator === "lte") return `${col(column)} <= ${push(params, rawValue)}`;
  throw new Error(`Filtro or não suportado: ${operator}`);
}

function compileFilter(filter: Filter, params: unknown[]): string {
  switch (filter.op) {
    case "eq":
      return `${col(filter.column)} = ${push(params, filter.value)}`;
    case "neq":
      return `${col(filter.column)} <> ${push(params, filter.value)}`;
    case "gt":
      return `${col(filter.column)} > ${push(params, filter.value)}`;
    case "gte":
      return `${col(filter.column)} >= ${push(params, filter.value)}`;
    case "lt":
      return `${col(filter.column)} < ${push(params, filter.value)}`;
    case "lte":
      return `${col(filter.column)} <= ${push(params, filter.value)}`;
    case "is":
      if (filter.value === null) return `${col(filter.column)} IS NULL`;
      if (filter.value === true) return `${col(filter.column)} IS TRUE`;
      if (filter.value === false) return `${col(filter.column)} IS FALSE`;
      return `${col(filter.column)} IS NOT DISTINCT FROM ${push(params, filter.value)}`;
    case "not":
      if (filter.operator === "is" && filter.value === null) {
        return `${col(filter.column)} IS NOT NULL`;
      }
      if (filter.operator === "eq") {
        return `${col(filter.column)} <> ${push(params, filter.value)}`;
      }
      throw new Error(`Operador not não suportado: ${filter.operator}`);
    case "in":
      if (filter.value.length === 0) return "FALSE";
      return `${col(filter.column)} IN (${filter.value
        .map((value) => push(params, value))
        .join(", ")})`;
    case "or":
      return `(${splitCommas(filter.raw)
        .map((part) => compileOrAtom(part, params))
        .join(" OR ")})`;
    default:
      throw new Error("Filtro desconhecido");
  }
}

function selectSql(items: SelectItem[], table: string, fk: Map<string, FkRef>): string {
  if (items.length === 1 && items[0]?.kind === "star") return "t.*";
  return items
    .map((item) => {
      if (item.kind === "star") return "t.*";
      if (item.kind === "column") return col(item.name);
      const ref = fk.get(`${table}.${item.table}`);
      if (!ref) {
        throw new Error(
          `Sem chave estrangeira de ${table} para ${item.table}`
        );
      }
      const embed =
        item.columns.length === 1 && item.columns[0]?.kind === "star"
          ? "to_jsonb(e)"
          : `jsonb_build_object(${item.columns
              .flatMap((column) => {
                if (column.kind !== "column") {
                  throw new Error("Embed aninhado não suportado");
                }
                return [`'${column.name}'`, `e.${ident(column.name)}`];
              })
              .join(", ")})`;
      return `(SELECT ${embed} FROM ${ident(item.table)} e WHERE e.${ident(ref.foreignColumn)} = t.${ident(ref.column)}) AS ${ident(item.table)}`;
    })
    .join(", ");
}

let fkPromise: Promise<Map<string, FkRef>> | null = null;

async function foreignKeys(): Promise<Map<string, FkRef>> {
  if (!fkPromise) {
    fkPromise = adminQuery(
      `SELECT kcu.table_name,
              kcu.column_name,
              ccu.table_name AS foreign_table,
              ccu.column_name AS foreign_column
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'`
    )
      .then((result) => {
        const map = new Map<string, FkRef>();
        for (const row of result.rows) {
          const key = `${row.table_name}.${row.foreign_table}`;
          if (!map.has(key)) {
            map.set(key, {
              column: String(row.column_name),
              foreignColumn: String(row.foreign_column),
            });
          }
        }
        return map;
      })
      .catch((error) => {
        fkPromise = null;
        throw error;
      });
  }
  return fkPromise;
}

function payloadRows(payload: unknown): Record<string, unknown>[] {
  const rows = Array.isArray(payload) ? payload : [payload];
  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("Payload de escrita inválido");
    }
    return row as Record<string, unknown>;
  });
}

export class QueryBuilder implements DbQuery {
  private action: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private columns = "*";
  private filters: Filter[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private limitN: number | null = null;
  private offsetN = 0;
  private countExact = false;
  private head = false;
  private payload: unknown = null;
  private returning: string | null = null;
  private onConflict: string | null = null;
  private cardinality: "many" | "single" | "maybe" = "many";

  constructor(
    private readonly table: string,
    private readonly run: QueryRunner
  ) {}

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    if (
      this.action === "insert" ||
      this.action === "update" ||
      this.action === "delete" ||
      this.action === "upsert"
    ) {
      this.returning = columns;
      return this;
    }
    this.action = "select";
    this.columns = columns;
    this.head = Boolean(options?.head);
    this.countExact = options?.count === "exact";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: "eq", column, value });
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push({ op: "neq", column, value });
    return this;
  }
  gt(column: string, value: unknown) {
    this.filters.push({ op: "gt", column, value });
    return this;
  }
  gte(column: string, value: unknown) {
    this.filters.push({ op: "gte", column, value });
    return this;
  }
  lt(column: string, value: unknown) {
    this.filters.push({ op: "lt", column, value });
    return this;
  }
  lte(column: string, value: unknown) {
    this.filters.push({ op: "lte", column, value });
    return this;
  }
  in(column: string, value: readonly unknown[]) {
    this.filters.push({ op: "in", column, value: [...value] });
    return this;
  }
  is(column: string, value: unknown) {
    this.filters.push({ op: "is", column, value });
    return this;
  }
  not(column: string, operator: string, value: unknown) {
    this.filters.push({ op: "not", column, operator, value });
    return this;
  }
  or(raw: string) {
    this.filters.push({ op: "or", raw });
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }
  limit(count: number) {
    this.limitN = count;
    return this;
  }
  range(from: number, to: number) {
    this.offsetN = Math.max(0, Math.floor(from));
    this.limitN = Math.min(100,Math.max(0,Math.floor(to)-this.offsetN+1));
    return this;
  }
  insert(payload: unknown) {
    this.action = "insert";
    this.payload = payload;
    this.returning = null;
    return this;
  }
  update(payload: unknown) {
    this.action = "update";
    this.payload = payload;
    this.returning = null;
    return this;
  }
  upsert(payload: unknown, options?: { onConflict?: string }) {
    this.action = "upsert";
    this.payload = payload;
    this.onConflict = options?.onConflict ?? null;
    this.returning = null;
    return this;
  }
  delete() {
    this.action = "delete";
    this.returning = null;
    return this;
  }
  single(): PromiseLike<OneResult> {
    this.cardinality = "single";
    return this.asOne();
  }
  maybeSingle(): PromiseLike<OneResult> {
    this.cardinality = "maybe";
    return this.asOne();
  }

  private asOne(): PromiseLike<OneResult> {
    return {
      then: (onfulfilled, onrejected) => this.execute().then(onfulfilled, onrejected),
    };
  }

  then<TResult1 = ListResult, TResult2 = never>(
    onfulfilled?: ((value: ListResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then((result) => {
      const list: ListResult = {
        data: Array.isArray(result.data) ? result.data : null,
        error: result.error,
        count: result.count,
      };
      return onfulfilled ? onfulfilled(list) : (list as TResult1);
    }, onrejected);
  }

  private where(params: unknown[]): string {
    if (this.filters.length === 0) return "";
    return ` WHERE ${this.filters.map((filter) => compileFilter(filter, params)).join(" AND ")}`;
  }

  private async toSql(): Promise<{ text: string; params: unknown[] }> {
    const params: unknown[] = [];
    const table = ident(this.table);
    const where = this.where(params);

    if (this.action === "select" && this.head) {
      return {
        text: `SELECT count(*)::int AS count FROM ${table} t${where}`,
        params,
      };
    }

    if (this.action === "select") {
      const fk = this.columns.includes("(") ? await foreignKeys() : new Map<string, FkRef>();
      const projected = selectSql(parseSelectList(this.columns), this.table, fk);
      const order =
        this.orders.length > 0
          ? ` ORDER BY ${this.orders
              .map(
                (item) =>
                  `${col(item.column)} ${item.ascending ? "ASC" : "DESC"}`
              )
              .join(", ")}`
          : "";
      const limit =
        this.limitN != null
          ? ` LIMIT ${Number.isInteger(this.limitN) && this.limitN >= 0 ? this.limitN : 0}`
          : "";
      return {
        text: `SELECT ${projected} FROM ${table} t${where}${order}${limit} OFFSET ${this.offsetN}`,
        params,
      };
    }

    if (this.action === "insert" || this.action === "upsert") {
      const rows = payloadRows(this.payload);
      const keys = [
        ...new Set(
          rows.flatMap((row) =>
            Object.keys(row).filter((key) => row[key] !== undefined)
          )
        ),
      ];
      const returning = this.returning ? ` RETURNING ${this.returningSql()}` : "";
      if (keys.length === 0) {
        return { text: `INSERT INTO ${table} DEFAULT VALUES${returning}`, params };
      }
      const values = rows
        .map((row) => {
          const placeholders = keys.map((key) =>
            row[key] === undefined ? "NULL" : push(params, row[key])
          );
          return `(${placeholders.join(", ")})`;
        })
        .join(", ");
      const columnList = keys.map((key) => ident(key)).join(", ");
      if (this.action === "upsert") {
        if (!this.onConflict) throw new Error("upsert sem onConflict");
        const conflict = this.onConflict
          .split(",")
          .map((name) => ident(name.trim()))
          .join(", ");
        const conflictSet = new Set(
          this.onConflict.split(",").map((name) => name.trim())
        );
        const updates = keys.filter((key) => !conflictSet.has(key));
        const action =
          updates.length === 0
            ? "DO NOTHING"
            : `DO UPDATE SET ${updates
                .map((key) => `${ident(key)} = EXCLUDED.${ident(key)}`)
                .join(", ")}`;
        return {
          text: `INSERT INTO ${table} (${columnList}) VALUES ${values} ON CONFLICT (${conflict}) ${action}${returning}`,
          params,
        };
      }
      return {
        text: `INSERT INTO ${table} (${columnList}) VALUES ${values}${returning}`,
        params,
      };
    }

    if (this.action === "update") {
      const [row] = payloadRows(this.payload);
      const entries = Object.entries(row ?? {}).filter(([, value]) => value !== undefined);
      if (entries.length === 0) throw new Error("update sem colunas");
      const sets = entries
        .map(([key, value]) => `${ident(key)} = ${push(params, value)}`)
        .join(", ");
      const returning = this.returning ? ` RETURNING ${this.returningSql()}` : "";
      return {
        text: `UPDATE ${table} AS t SET ${sets}${where}${returning}`,
        params,
      };
    }

    const returning = this.returning ? ` RETURNING ${this.returningSql()}` : "";
    return {
      text: `DELETE FROM ${table} AS t${where}${returning}`,
      params,
    };
  }

  private returningSql(): string {
    const list = this.returning ?? "*";
    if (list.trim() === "*") return "*";
    return parseSelectList(list)
      .map((item) => {
        if (item.kind !== "column") throw new Error("RETURNING só aceita colunas");
        return ident(item.name);
      })
      .join(", ");
  }

  private shape(rows: Record<string, unknown>[]): DbResult {
    if (this.cardinality === "single") {
      if (rows.length !== 1) {
        return {
          data: null,
          error: {
            message: "JSON object requested, multiple (or no) rows returned",
            code: "PGRST116",
            details: null,
          },
          count: null,
        };
      }
      return { data: rows[0], error: null, count: null };
    }
    if (this.cardinality === "maybe") {
      if (rows.length === 0) return { data: null, error: null, count: null };
      if (rows.length > 1) {
        return {
          data: null,
          error: {
            message: "JSON object requested, multiple (or no) rows returned",
            code: "PGRST116",
            details: null,
          },
          count: null,
        };
      }
      return { data: rows[0], error: null, count: null };
    }
    return { data: rows, error: null, count: null };
  }

  private async execute(): Promise<DbResult> {
    try {
      const { text, params } = await this.toSql();
      const result = await this.run(text, params);
      if (this.action === "select" && this.head) {
        const count = Number(result.rows[0]?.count ?? 0);
        return { data: null, error: null, count };
      }
      if (
        (this.action === "insert" ||
          this.action === "update" ||
          this.action === "delete" ||
          this.action === "upsert") &&
        !this.returning
      ) {
        return { data: null, error: null, count: null };
      }
      const rows = result.rows.map((row: QueryResultRow) =>
        normalizeValue(row)
      ) as Record<string, unknown>[];
      const shaped=this.shape(rows);
      if(this.action === "select" && this.countExact) {
        const params:unknown[]=[];
        const where=this.where(params);
        const count=await this.run(`SELECT count(*)::int AS count FROM ${ident(this.table)} t${where}`,params);
        shaped.count=Number(count.rows[0]?.count ?? 0);
      }
      return shaped;
    } catch (error) {
      return { data: null, error: toError(error), count: null };
    }
  }
}
