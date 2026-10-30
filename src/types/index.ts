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
  pickup_location: string | null;
  dropoff_location: string | null;
  free_by_time: string | null;
  admin_message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  payment_status: 'pending' | 'paid' | 'waived';
  payment_method: 'online' | 'cash' | null;
  approved_time: string | null;
  rate_applied: number | null;
  created_at: string;
}

// Row of public.seat_occupancy — the only view of other passengers'
// bookings a passenger gets (no payment or location data).
export type SeatBooking = Pick<Booking, 'id' | 'trip_id' | 'user_id' | 'seat_number' | 'status' | 'created_at'>;

export interface Route {
  id: string;
  name: string;
  stops: string[];
  is_preset: boolean;
}

export type SeatStatus = 'available' | 'pending' | 'approved' | 'mine-pending';

export interface BookingSubmission {
  pickup_location?: string;
  dropoff_location?: string;
  free_by_time?: string;
}

export interface ApprovalSubmission {
  approved_time?: string;
  admin_message?: string;
}
