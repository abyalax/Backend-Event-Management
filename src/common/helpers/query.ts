export function rangeFilter(field: string, min?: number, max?: number, whereClauses: string[] = [], params: (string | number)[] = []) {
  if (min && !max) {
    whereClauses.push(`${field} >= ?`);
    params.push(min);
  } else if (!min && max) {
    whereClauses.push(`${field} <= ?`);
    params.push(max);
  } else if (min && max && max > min) {
    whereClauses.push(`${field} BETWEEN ? AND ?`);
    params.push(min, max);
  }
}
/**
example use
const whereClauses: string[] = [];
const params: (string | number)[] = [];
rangeFilter('transaction.total_profit', query.min_total_profit, query.max_total_profit, whereClauses, params);
example extract of rangeFilter
if (query?.min_total_profit && !query?.max_total_profit) {
    whereClauses.push(`transaction.total_profit >= ?`);
    params.push(query.min_total_profit);
}

if (!query?.min_total_profit && query?.max_total_profit) {
    whereClauses.push(`transaction.total_profit <= ?`);
    params.push(query.max_total_profit);
}

if (query?.min_total_profit && query?.max_total_profit && query.max_total_profit > query.min_total_profit) {
    whereClauses.push(`transaction.total_profit BETWEEN ? AND ?`);
    params.push(query.min_total_profit, query.max_total_profit);
}
 */
