/**
 * Helper để convert filter functions thành filter objects
 * Hỗ trợ các filter patterns phổ biến
 */

export interface FilterObject {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is' | 'isNot';
  value: any;
}

/**
 * Thử extract filter objects từ filter function
 * Chỉ hỗ trợ các patterns đơn giản
 */
export function tryExtractFilters(
  filterFn: (query: any) => any,
  tableName: string,
  supabaseClient: any
): FilterObject[] | null {
  try {
    // Tạo một mock query builder để capture filters
    const filters: FilterObject[] = [];
    let queryBuilder = supabaseClient.from(tableName).select('*');
    
    // Wrap các methods để capture filters
    const originalMethods: any = {};
    const methodsToWrap = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is'];
    
    methodsToWrap.forEach(method => {
      originalMethods[method] = queryBuilder[method];
      queryBuilder[method] = function(column: string, value: any) {
        filters.push({
          column,
          operator: method as FilterObject['operator'],
          value
        });
        return originalMethods[method].call(this, column, value);
      };
    });
    
    // Thử apply filter function
    filterFn(queryBuilder);
    
    // Nếu có filters được capture, return chúng
    if (filters.length > 0) {
      return filters;
    }
    
    return null;
  } catch (error) {
    // Nếu không thể extract, return null để fallback
    return null;
  }
}

/**
 * Convert các filter patterns phổ biến thành filter objects
 * Hỗ trợ: eq, is (null), và các patterns đơn giản khác
 */
export function convertCommonFilters(
  filterFn: (query: any) => any,
  tableName: string
): FilterObject[] | null {
  // Convert function to string để parse (hacky nhưng work)
  const fnString = filterFn.toString();
  
  // Pattern: query.eq('column', value)
  const eqMatch = fnString.match(/\.eq\(['"]([^'"]+)['"],\s*([^)]+)\)/);
  if (eqMatch) {
    const column = eqMatch[1];
    const valueStr = eqMatch[2].trim();
    // Try to parse value (remove quotes if string)
    let value = valueStr;
    if (valueStr.startsWith("'") || valueStr.startsWith('"')) {
      value = valueStr.slice(1, -1);
    } else if (valueStr === 'null') {
      value = null;
    } else if (!isNaN(Number(valueStr))) {
      value = Number(valueStr);
    }
    
    return [{
      column,
      operator: 'eq',
      value
    }];
  }
  
  // Pattern: query.is('column', null)
  const isMatch = fnString.match(/\.is\(['"]([^'"]+)['"],\s*(null)\)/);
  if (isMatch) {
    return [{
      column: isMatch[1],
      operator: 'is',
      value: null
    }];
  }
  
  // Không thể convert
  return null;
}

