/**
 * API Client để gọi API routes thay vì Supabase trực tiếp
 * Giúp ẩn Supabase URLs khỏi network tab của browser
 */

interface Filter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is' | 'isNot';
  value: any;
}

interface QueryOptions {
  select?: string;
  filters?: Filter[];
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
  limit?: number;
}

interface InsertOptions {
  data: Record<string, any>;
}

interface UpdateOptions {
  data: Record<string, any>;
  filters: Filter[];
}

/**
 * Select data from a table
 */
export async function apiSelect<T = any>(
  table: string,
  options?: QueryOptions
): Promise<{ data: T[] | null; error: any }> {
  try {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table,
        operation: 'select',
        select: options?.select,
        filters: options?.filters,
        orderBy: options?.orderBy,
        limit: options?.limit,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: result.error };
    }

    return { data: result.data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Insert data into a table
 */
export async function apiInsert<T = any>(
  table: string,
  options: InsertOptions
): Promise<{ data: T[] | null; error: any }> {
  try {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table,
        operation: 'insert',
        data: options.data,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: result.error };
    }

    return { data: result.data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Update data in a table
 */
export async function apiUpdate<T = any>(
  table: string,
  options: UpdateOptions
): Promise<{ data: T[] | null; error: any }> {
  try {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table,
        operation: 'update',
        data: options.data,
        filters: options.filters,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: result.error };
    }

    return { data: result.data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Delete data from a table
 */
export async function apiDelete(
  table: string,
  filters: Filter[]
): Promise<{ error: any }> {
  try {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table,
        operation: 'delete',
        filters,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

