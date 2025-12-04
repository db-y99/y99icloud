import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API Proxy Route để ẩn Supabase URLs khỏi client-side
 * Tất cả các requests đến Supabase sẽ đi qua route này
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { 
      table, 
      operation, // 'select', 'insert', 'update', 'delete'
      data, 
      filters, 
      select, 
      orderBy,
      limit
    } = body;

    if (!table || !operation) {
      return NextResponse.json(
        { error: 'Missing required parameters: table and operation' },
        { status: 400 }
      );
    }

    let queryBuilder: any = supabase.from(table);

    // Apply select first
    if (select) {
      queryBuilder = queryBuilder.select(select);
    } else {
      queryBuilder = queryBuilder.select('*');
    }

    // Apply filters (sau khi select, queryBuilder trở thành PostgrestFilterBuilder)
    if (filters && Array.isArray(filters)) {
      filters.forEach((filter: any) => {
        const { column, operator, value } = filter;
        switch (operator) {
          case 'eq':
            queryBuilder = queryBuilder.eq(column, value);
            break;
          case 'neq':
            queryBuilder = queryBuilder.neq(column, value);
            break;
          case 'gt':
            queryBuilder = queryBuilder.gt(column, value);
            break;
          case 'gte':
            queryBuilder = queryBuilder.gte(column, value);
            break;
          case 'lt':
            queryBuilder = queryBuilder.lt(column, value);
            break;
          case 'lte':
            queryBuilder = queryBuilder.lte(column, value);
            break;
          case 'like':
            queryBuilder = queryBuilder.like(column, value);
            break;
          case 'ilike':
            queryBuilder = queryBuilder.ilike(column, value);
            break;
          case 'in':
            queryBuilder = queryBuilder.in(column, value);
            break;
          case 'is':
            queryBuilder = queryBuilder.is(column, value);
            break;
          case 'isNot':
            queryBuilder = queryBuilder.not(column, 'is', value);
            break;
        }
      });
    }

    // Apply ordering
    if (orderBy) {
      queryBuilder = queryBuilder.order(orderBy.column, { 
        ascending: orderBy.ascending ?? true 
      });
    }

    // Apply limit
    if (limit && operation === 'select') {
      queryBuilder = queryBuilder.limit(limit);
    }

    let result: any;

    switch (operation) {
      case 'select':
        result = await queryBuilder;
        break;
      case 'insert':
        if (!data) {
          return NextResponse.json(
            { error: 'Missing data for insert operation' },
            { status: 400 }
          );
        }
        // For insert, we need to use the base query builder
        result = await supabase.from(table).insert(data);
        break;
      case 'update':
        if (!data) {
          return NextResponse.json(
            { error: 'Missing data for update operation' },
            { status: 400 }
          );
        }
        // For update, apply filters to base query builder
        let updateQuery: any = supabase.from(table);
        if (filters && Array.isArray(filters)) {
          filters.forEach((filter: any) => {
            const { column, operator, value } = filter;
            switch (operator) {
              case 'eq':
                updateQuery = updateQuery.eq(column, value);
                break;
              case 'neq':
                updateQuery = updateQuery.neq(column, value);
                break;
              case 'gt':
                updateQuery = updateQuery.gt(column, value);
                break;
              case 'gte':
                updateQuery = updateQuery.gte(column, value);
                break;
              case 'lt':
                updateQuery = updateQuery.lt(column, value);
                break;
              case 'lte':
                updateQuery = updateQuery.lte(column, value);
                break;
              case 'like':
                updateQuery = updateQuery.like(column, value);
                break;
              case 'ilike':
                updateQuery = updateQuery.ilike(column, value);
                break;
              case 'in':
                updateQuery = updateQuery.in(column, value);
                break;
              case 'is':
                updateQuery = updateQuery.is(column, value);
                break;
              case 'isNot':
                updateQuery = updateQuery.not(column, 'is', value);
                break;
            }
          });
        }
        result = await updateQuery.update(data);
        break;
      case 'delete':
        // For delete, apply filters to base query builder
        let deleteQuery: any = supabase.from(table);
        if (filters && Array.isArray(filters)) {
          filters.forEach((filter: any) => {
            const { column, operator, value } = filter;
            switch (operator) {
              case 'eq':
                deleteQuery = deleteQuery.eq(column, value);
                break;
              case 'neq':
                deleteQuery = deleteQuery.neq(column, value);
                break;
              case 'gt':
                deleteQuery = deleteQuery.gt(column, value);
                break;
              case 'gte':
                deleteQuery = deleteQuery.gte(column, value);
                break;
              case 'lt':
                deleteQuery = deleteQuery.lt(column, value);
                break;
              case 'lte':
                deleteQuery = deleteQuery.lte(column, value);
                break;
              case 'like':
                deleteQuery = deleteQuery.like(column, value);
                break;
              case 'ilike':
                deleteQuery = deleteQuery.ilike(column, value);
                break;
              case 'in':
                deleteQuery = deleteQuery.in(column, value);
                break;
              case 'is':
                deleteQuery = deleteQuery.is(column, value);
                break;
              case 'isNot':
                deleteQuery = deleteQuery.not(column, 'is', value);
                break;
            }
          });
        }
        result = await deleteQuery.delete();
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported operation: ${operation}` },
          { status: 400 }
        );
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      data: result.data,
      count: result.count 
    });
  } catch (error: any) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

