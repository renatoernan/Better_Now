export type DiscountType = 'percentage' | 'fixed';

export interface EventCoupon {
  id: string;
  event_id: string;
  code: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number;
  current_uses: number;
  limit_one_per_cpf: boolean;
  batch_indexes?: number[] | null;
  valid_from: string;
  valid_until: string;
  min_order_value?: number;
  is_active: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  // Campos expandidos para visualização
  event?: {
    id: string;
    title: string;
    event_date?: string;
  };
}

export interface EventCouponUsage {
  id: string;
  coupon_id: string;
  order_id?: string | null;
  event_id: string;
  client_name?: string | null;
  client_document?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  batch_index?: number | null;
  discount_applied: number;
  original_amount: number;
  final_amount: number;
  used_at: string;
  coupon?: EventCoupon;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon_id?: string;
  code?: string;
  discount_type?: DiscountType;
  discount_value?: number;
  discount_applied?: number;
  original_amount?: number;
  final_amount?: number;
  current_uses?: number;
  max_uses?: number;
}

export interface CreateCouponDTO {
  event_id: string;
  code: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number;
  limit_one_per_cpf?: boolean;
  batch_indexes?: number[] | null;
  valid_from: string;
  valid_until: string;
  min_order_value?: number;
  is_active?: boolean;
}

export interface UpdateCouponDTO extends Partial<CreateCouponDTO> {}

export interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  totalUsages: number;
  totalDiscountGiven: number;
}
