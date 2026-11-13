"use client";

// Drop-in replacement for the subset of supabase-js the admin app uses.
// Queries go to /api/db (local dev MongoDB); uploads go to /api/images.
//
//   dbClient.from("questions").select("*").eq("topic_id", id).order("sr_no")
//   dbClient.from("topics").insert({...}).select().single()
//   dbClient.from("questions").update({ level: 2 }).in("id", ids)
//   dbClient.storage.from("bucket").upload("dir/file.png", file, { upsert: true })

export type DbError = { message: string; code?: string; details?: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = any; // rows are untyped, as with the untyped supabase client
// Like supabase-js: once `error` is checked, `data` is known to be present.
export type DbResult<T = Row[]> = { data: T; error: null } | { data: null; error: DbError };

type Action = "select" | "insert" | "update";

class Query<T = Row[]> implements PromiseLike<DbResult<T>> {
  private columns = "*";
  private filters: { op: "eq" | "in"; column: string; value: unknown }[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private isSingle = false;
  private returning = false;

  constructor(
    private table: string,
    private action: Action,
    private values?: unknown,
  ) {}

  select(columns = "*") {
    this.columns = columns;
    if (this.action !== "select") this.returning = true;
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push({ op: "eq", column, value });
    return this;
  }
  in(column: string, value: unknown[]) {
    this.filters.push({ op: "in", column, value });
    return this;
  }
  order(column: string, opts: { ascending?: boolean } = {}) {
    this.orders.push({ column, ascending: opts.ascending !== false });
    return this;
  }
  single() {
    this.isSingle = true;
    return this as unknown as Query<Row>;
  }

  private async run(): Promise<DbResult<T>> {
    try {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: this.table,
          action: this.action,
          columns: this.columns,
          filters: this.filters,
          order: this.orders,
          single: this.isSingle,
          values: this.values,
          returning: this.returning,
        }),
      });
      return (await res.json()) as DbResult<T>;
    } catch (e: any) {
      return { data: null, error: { message: e?.message || "Network error" } };
    }
  }

  then<R1 = DbResult<T>, R2 = never>(
    onfulfilled?: ((value: DbResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

class Table {
  constructor(private table: string) {}
  select(columns = "*") {
    return new Query(this.table, "select").select(columns);
  }
  insert(values: unknown) {
    return new Query(this.table, "insert", values);
  }
  update(values: unknown) {
    return new Query(this.table, "update", values);
  }
}

const storage = {
  // bucket is ignored: images live in this exam's local images folder
  from(_bucket: string) {
    return {
      async upload(
        filePath: string,
        file: Blob,
        _opts?: { upsert?: boolean; contentType?: string },
      ): Promise<DbResult<{ path: string }>> {
        try {
          const url = "/api/images/" + filePath.split("/").map(encodeURIComponent).join("/");
          const res = await fetch(url, { method: "POST", body: file });
          return (await res.json()) as DbResult<{ path: string }>;
        } catch (e: any) {
          return { data: null, error: { message: e?.message || "Upload failed" } };
        }
      },
    };
  },
};

export const dbClient = {
  from: (table: string) => new Table(table),
  storage,
};
