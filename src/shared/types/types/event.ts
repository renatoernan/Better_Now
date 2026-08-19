import { PriceBatch, ScheduleItem, PaymentMethodFee, CheckoutFieldConfig } from './core';

// Re-export PriceBatch, ScheduleItem, PaymentMethodFee and CheckoutFieldConfig for external use
export type { PriceBatch, ScheduleItem, PaymentMethodFee, CheckoutFieldConfig } from './core';

export interface Event {
  id: string;
  title: string;
  name?: string; // Keep for backward compatibility
  description: string;
  basic_description?: string;
  detailed_description?: string;
  event_date: string;
  event_time?: string;
  end_date?: string;
  end_time?: string;
  location?: string;
  location_link?: string;
  image_url?: string;
  event_type: string;
  event_type_id?: string;
  max_participants?: number;
  max_guests?: number; // Added for AdminEvents compatibility
  current_guests?: number; // Added for AdminEvents compatibility
  capacity?: number;
  images?: string[];
  videos?: string[];
  status: 'active' | 'cancelled' | 'completed' | 'draft'; // Added status property
  is_active?: boolean;
  is_public?: boolean;
  requires_approval?: boolean;
  category?: string;
  contact_email?: string;
  contact_phone?: string;
  additional_info?: string;
  allow_ticket_sales?: boolean;
  price_batches?: PriceBatch[] | string;
  payment_methods?: PaymentMethodFee[];
  checkout_fields?: CheckoutFieldConfig[];
  waha_msg_order_created?: string;
  waha_msg_order_confirmed?: string;
  waha_msg_order_cancelled?: string;
  schedule?: ScheduleItem[] | string;
  registration_deadline?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface EventDetailsProps {
  event: Event;
}

export interface EventImageProps {
  imageUrl?: string;
  title: string;
  onShare: () => void;
}

export interface EventInfoProps {
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  location?: string;
  locationLink?: string;
  maxParticipants?: number;
  eventType: string;
  description: string;
}

export interface EventDescriptionProps {
  basicDescription?: string;
  detailedDescription?: string;
  schedule?: ScheduleItem[];
}

export interface TicketCardProps {
  priceBatches: PriceBatch[];
  selectedBatch: number;
  quantity: number;
  paymentMethods?: PaymentMethodFee[];
  selectedPaymentMethod?: string;
  onPaymentMethodSelect?: (method: string) => void;
  selectedInstallments?: number;
  onInstallmentsSelect?: (installments: number) => void;
  onBatchSelect: (index: number) => void;
  onQuantityChange: (increment: boolean) => void;
  onPurchase: () => void;
  registrationDeadline?: string;
}

export type BatchStatus = 'active' | 'expired' | 'upcoming';