declare module '@supabase/supabase-js' {
  interface PostgrestResponse<T = unknown> {
    data: T | null;
    error: Error | null;
    count?: number;
  }

  interface PostgrestBuilder<ResponseType = unknown> {
    then: <T>(onfulfilled: (value: PostgrestResponse<ResponseType>) => T) => Promise<T>;
  }

  interface PostgrestFilterBuilder<T, ResponseType = T> extends PostgrestBuilder<ResponseType> {
    eq(column: string, value: unknown): PostgrestFilterBuilder<T, ResponseType>;
    single(): PostgrestFilterBuilder<T, T | null>;
  }

  interface FromBuilder {
    select(columns: string): PostgrestFilterBuilder<unknown, unknown[]>;
    select(columns: string, options: { count: 'exact'; head: true }): PostgrestFilterBuilder<unknown, unknown[]>;
    insert(values: readonly unknown[]): PostgrestFilterBuilder<unknown, unknown>;
    update(value: unknown): PostgrestFilterBuilder<unknown, unknown>;
    delete(): PostgrestFilterBuilder<unknown, unknown>;
    eq(column: string, value: unknown): PostgrestFilterBuilder<unknown, unknown>;
  }

  function createClient(url: string, key: string): {
    from(collection: string): FromBuilder;
  };
  export { createClient };
  export type SupabaseClient = ReturnType<typeof createClient>;
}