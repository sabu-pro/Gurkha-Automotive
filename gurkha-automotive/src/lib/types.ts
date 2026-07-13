export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_from_cents: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  service_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  vehicle_rego: string;
  vehicle_make: string;
  vehicle_model: string;
  notes: string | null;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  status: BookingStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  service?: Service;
}

export interface BusinessHours {
  id: number;
  day_of_week: number; // 0 = Sunday .. 6 = Saturday
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export interface BlockedDate {
  id: string;
  blocked_date: string; // YYYY-MM-DD
  reason: string | null;
}

export interface Database {
  public: {
    Tables: {
      services: {
        Row: Service;
        Insert: Partial<Service> & { name: string; duration_minutes: number };
        Update: Partial<Service>;
      };
      bookings: {
        Row: Booking;
        Insert: Partial<Booking> & {
          service_id: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          vehicle_rego: string;
          vehicle_make: string;
          vehicle_model: string;
          booking_date: string;
          start_time: string;
          end_time: string;
        };
        Update: Partial<Booking>;
      };
      business_hours: {
        Row: BusinessHours;
        Insert: Partial<BusinessHours> & { day_of_week: number };
        Update: Partial<BusinessHours>;
      };
      blocked_dates: {
        Row: BlockedDate;
        Insert: Partial<BlockedDate> & { blocked_date: string };
        Update: Partial<BlockedDate>;
      };
    };
  };
}
