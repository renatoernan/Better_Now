export interface EventParticipant {
  id: string;
  event_id: string;
  client_id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  checked_in_at?: string;
  registration_date: string;
  price_paid?: number;
  batch_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}