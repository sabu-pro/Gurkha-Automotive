export const BOOKING_STATUSES = ["pending", "confirmed", "rejected", "cancelled", "completed"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type BookingSource = "web_form" | "assistant" | "admin";

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_from_cents: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Booking {
  id: string;
  reference: string;
  service_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  vehicle_rego: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number | null;
  problem_description: string | null;
  notes: string | null;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  status: BookingStatus;
  status_reason: string | null;
  admin_notes: string | null;
  source: BookingSource;
  client_request_id: string | null;
  created_at: string;
  updated_at: string;
  service?: Service;
}

export type BookingEventType =
  | "created"
  | "status_changed"
  | "rescheduled"
  | "notes_updated"
  | "email_sent"
  | "email_failed";

export interface BookingEvent {
  id: number;
  booking_id: string;
  event_type: BookingEventType;
  from_status: string | null;
  to_status: string | null;
  from_date: string | null;
  from_start_time: string | null;
  to_date: string | null;
  to_start_time: string | null;
  detail: string | null;
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
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

export interface SiteContent {
  id: string;
  section: string;
  field: string;
  value: string | null;
  updated_at: string;
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
      booking_events: {
        Row: BookingEvent;
        Insert: Partial<BookingEvent> & { booking_id: string; event_type: BookingEventType };
        Update: never;
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
      site_content: {
        Row: SiteContent;
        Insert: Partial<SiteContent> & { section: string; field: string };
        Update: Partial<SiteContent>;
      };
    };
  };
}
