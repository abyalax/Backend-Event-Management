export interface TotalSales {
  totalSales: string;
  totalOrders: string;
}

export interface TopEvent {
  event_id: string;
  event_title: string;
  totalsales: string;
  totalorders: string;
}

export type TopEvents = TopEvent[];

export interface TopCategory {
  category_id_category: 2;
  category_name: 'Workshop';
  totalsales: '158703565.00';
  totalorders: '98';
}

export type TopCategories = TopCategory[];
