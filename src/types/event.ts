export interface PriceBatch {
  name: string;
  price: number;
  start_date?: string;
  end_date?: string;
  deadline?: string;
  description?: string;
}

export interface ScheduleItem {
  time: string;
  activity: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  basic_description?: string;
  detailed_description?: string;
  event_date: string;
  event_time?: string;
  end_time?: string;
  location?: string;
  location_link?: string;
  image_url?: string;
  event_type: string;
  max_participants?: number;
  price_batches?: PriceBatch[] | string;
  schedule?: ScheduleItem[] | string;
  registration_deadline?: string;
  created_at?: string;
  updated_at?: string;
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
  onBatchSelect: (index: number) => void;
  onQuantityChange: (increment: boolean) => void;
  onPurchase: () => void;
  registrationDeadline?: string;
}

export type BatchStatus = 'active' | 'expired' | 'upcoming';