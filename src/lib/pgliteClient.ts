type FilterOp = 'eq' | 'neq' | 'gte' | 'lte' | 'lt' | 'in' | 'ilike';

interface Filter {
    column: string;
    op: FilterOp;
    value: any;
}

interface OrderRule {
    column: string;
    ascending: boolean;
}

interface QueryResult<T = any> {
    data: T | null;
    error: any;
    count?: number | null;
}

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        ...options,
        headers: {
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...(options.headers || {}),
        },
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
        const message = body?.error?.message || body?.message || response.statusText;
        throw { message, status: response.status };
    }
    return body;
}

class ApiQueryBuilder implements PromiseLike<QueryResult<any>> {
    private filters: Filter[] = [];
    private orders: OrderRule[] = [];
    private limitCount: number | null = null;
    private selectClause = '*';
    private returnMode: 'many' | 'single' | 'maybeSingle' = 'many';
    private operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
    private payload: any;
    private head = false;
    private countRequested = false;
    private orExpression = '';
    private conflict?: string;

    constructor(private table: string) { }

    select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
        this.operation = this.operation === 'select' ? 'select' : this.operation;
        this.selectClause = columns;
        this.countRequested = options?.count === 'exact';
        this.head = !!options?.head;
        return this;
    }

    insert(payload: any) {
        this.operation = 'insert';
        this.payload = payload;
        return this;
    }

    update(payload: any) {
        this.operation = 'update';
        this.payload = payload;
        return this;
    }

    delete() {
        this.operation = 'delete';
        return this;
    }

    upsert(payload: any, options?: { onConflict?: string }) {
        this.operation = 'upsert';
        this.payload = payload;
        this.conflict = options?.onConflict;
        return this;
    }

    eq(column: string, value: any) { this.filters.push({ column, op: 'eq', value }); return this; }
    neq(column: string, value: any) { this.filters.push({ column, op: 'neq', value }); return this; }
    gte(column: string, value: any) { this.filters.push({ column, op: 'gte', value }); return this; }
    lte(column: string, value: any) { this.filters.push({ column, op: 'lte', value }); return this; }
    lt(column: string, value: any) { this.filters.push({ column, op: 'lt', value }); return this; }
    in(column: string, value: any[]) { this.filters.push({ column, op: 'in', value }); return this; }
    ilike(column: string, value: string) { this.filters.push({ column, op: 'ilike', value }); return this; }
    or(expression: string) { this.orExpression = expression; return this; }
    order(column: string, options?: { ascending?: boolean }) {
        this.orders.push({ column, ascending: options?.ascending !== false });
        return this;
    }
    limit(count: number) { this.limitCount = count; return this; }
    range(from: number, to: number) { this.limitCount = to - from + 1; return this; }
    single() { this.returnMode = 'single'; return this; }
    maybeSingle() { this.returnMode = 'maybeSingle'; return this; }

    then<TResult1 = QueryResult<any>, TResult2 = never>(
        onfulfilled?: ((value: QueryResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    private async execute(): Promise<QueryResult> {
        try {
            return await apiFetch<QueryResult>('/api/query', {
                method: 'POST',
                body: JSON.stringify({
                    table: this.table,
                    operation: this.operation,
                    payload: this.payload,
                    filters: this.filters,
                    orders: this.orders,
                    limitCount: this.limitCount,
                    selectClause: this.selectClause,
                    returnMode: this.returnMode,
                    head: this.head,
                    countRequested: this.countRequested,
                    orExpression: this.orExpression,
                    conflict: this.conflict,
                }),
            });
        } catch (error) {
            return { data: null, error };
        }
    }
}

async function rpc(name: string, params?: Record<string, any>): Promise<QueryResult> {
    try {
        return await apiFetch<QueryResult>('/api/rpc', {
            method: 'POST',
            body: JSON.stringify({ name, params }),
        });
    } catch (error) {
        return { data: null, error };
    }
}

export const pgliteClient = {
    initialize() {
        return apiFetch('/api/health').then(() => undefined);
    },
    from(table: string) {
        return new ApiQueryBuilder(table);
    },
    rpc,
    auth: {
        async getUser() {
            try {
                const result = await apiFetch<{ user: any; error: any }>('/api/auth/me');
                return { data: { user: result.user }, error: result.error };
            } catch (error) {
                return { data: { user: null }, error };
            }
        },
    },
    storage: {
        from(bucket: string) {
            return {
                async upload(path: string, file: File) {
                    try {
                        const form = new FormData();
                        form.append('path', path);
                        form.append('file', file);
                        return await apiFetch<{ data: { path: string; publicUrl: string }; error: any }>(
                            `/api/storage/${encodeURIComponent(bucket)}`,
                            { method: 'POST', body: form }
                        );
                    } catch (error) {
                        return { data: null, error };
                    }
                },
                getPublicUrl(path: string) {
                    return { data: { publicUrl: `${API_BASE}/api/storage/${encodeURIComponent(bucket)}/${path}` } };
                },
                async remove(paths: string[]) {
                    try {
                        await Promise.all(paths.map((path) => apiFetch(
                            `/api/storage/${encodeURIComponent(bucket)}/${path}`,
                            { method: 'DELETE' }
                        )));
                        return { data: null, error: null };
                    } catch (error) {
                        return { data: null, error };
                    }
                },
            };
        },
    },
};

export const uploadFile = async (
    bucket: string,
    path: string,
    file: File
): Promise<{ url?: string; error?: string }> => {
    const { data, error } = await pgliteClient.storage.from(bucket).upload(path, file);
    if (error) return { error: error.message };
    return { url: data?.publicUrl || pgliteClient.storage.from(bucket).getPublicUrl(path).data.publicUrl };
};

export const deleteFile = async (
    bucket: string,
    path: string
): Promise<{ error?: string }> => {
    const { error } = await pgliteClient.storage.from(bucket).remove([path]);
    return error ? { error: error.message } : {};
};

export const getPublicUrl = (bucket: string, path: string): string => {
    return pgliteClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};
