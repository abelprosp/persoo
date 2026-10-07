export type DbError = {
  message: string;
  code?: string;
  details?: string | null;
};

export type DbResult = {
  // The compatibility query builder accepts projections at runtime. Narrow at DTO boundaries.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  error: DbError | null;
  count: number | null;
};

export type ListResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime SQL projections; callers narrow DTOs.
  data: any[] | null;
  error: DbError | null;
  count: number | null;
};

export type OneResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Runtime SQL projections; callers narrow DTOs.
  data: any;
  error: DbError | null;
  count: number | null;
};

export interface DbQuery extends PromiseLike<ListResult> {
  select(
    columns?: string,
    options?: { count?: "exact"; head?: boolean }
  ): DbQuery;
  eq(column: string, value: unknown): DbQuery;
  neq(column: string, value: unknown): DbQuery;
  gt(column: string, value: unknown): DbQuery;
  gte(column: string, value: unknown): DbQuery;
  lt(column: string, value: unknown): DbQuery;
  lte(column: string, value: unknown): DbQuery;
  in(column: string, value: readonly unknown[]): DbQuery;
  is(column: string, value: unknown): DbQuery;
  not(column: string, operator: string, value: unknown): DbQuery;
  or(filters: string): DbQuery;
  order(column: string, options?: { ascending?: boolean }): DbQuery;
  limit(count: number): DbQuery;
  range(from: number, to: number): DbQuery;
  insert(payload: unknown): DbQuery;
  update(payload: unknown): DbQuery;
  upsert(payload: unknown, options?: { onConflict?: string }): DbQuery;
  delete(): DbQuery;
  single(): PromiseLike<OneResult>;
  maybeSingle(): PromiseLike<OneResult>;
}

export type AppUser = {
  id: string;
  email?: string | null;
};

export type DbClient = {
  from: (table: string) => DbQuery;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<DbResult>;
  auth: {
    getUser: () => Promise<{ data: { user: AppUser | null }; error: null }>;
    updateUser: (attrs: {
      password?: string;
    }) => Promise<{ data: { user: AppUser | null }; error: DbError | null }>;
    exchangeCodeForSession: (
      code: string
    ) => Promise<{ error: DbError | null }>;
  };
};
