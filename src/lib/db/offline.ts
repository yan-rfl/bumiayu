import Dexie, { type Table } from 'dexie';
import type { Product, Store, SalesOrder } from '@/types/database';

export interface OfflinePendingOrder {
  id?: number;
  local_order_id: string;
  order_data: Partial<SalesOrder>;
  created_at: string;
  is_synced: boolean;
}

export class BumiAyuOfflineDatabase extends Dexie {
  stores!: Table<Store, string>;
  products!: Table<Product, string>;
  pendingOrders!: Table<OfflinePendingOrder, number>;

  constructor() {
    super('BumiAyuOfflineDB');
    this.version(1).stores({
      stores: 'id, code, name, zone_code, is_locked',
      products: 'id, sku, name, category',
      pendingOrders: '++id, local_order_id, is_synced, created_at',
    });
  }
}

export const offlineDB = new BumiAyuOfflineDatabase();
