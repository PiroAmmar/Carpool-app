export interface Trip {
  id: string;
  trip_date: string;
  trip_time: string;
  seats_total: number;
  route_id: string | null;
  direction: string | null;
  rate: number | null;
  status: 'scheduled' | 'cancelled' | 'completed' | 'closed';
}

export interface Booking {
  id: string;
  trip_id: string;
  user_id: string;
  seat_number: number;
  pickup_location: string;
  status: 'pending' | 'approved' | 'rejected';
  payment_status: 'pending' | 'paid' | 'waived';
  approved_time: string | null;
  created_at: string;
}

export interface Route {
  id: string;
  name: string;
  stops: string[];
  is_preset: boolean;
}

export type SeatStatus = 'available' | 'pending' | 'approved' | 'mine-pending';
