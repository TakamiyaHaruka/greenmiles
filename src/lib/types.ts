// Shared client-side types for the data returned by the API routes

/** A green product in the miles mall, as returned by /api/products and /api/admin/products */
export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  mileage_cost: number;
  stock: number;
  icon_type: string;
  /** Offset project attribution ('' when the product has none, e.g. coupons) */
  project_name: string;
  project_standard: string;
  project_vintage: string;
}
