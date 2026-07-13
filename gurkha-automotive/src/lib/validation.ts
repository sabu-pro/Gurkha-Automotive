import { z } from "zod";

export const bookingRequestSchema = z.object({
  service_id: z.string().uuid({ message: "Please choose a service." }),
  booking_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Please choose a valid date." }),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, { message: "Please choose a valid time." }),
  customer_name: z.string().trim().min(2, "Please enter your full name.").max(120),
  customer_email: z.string().trim().email("Please enter a valid email address."),
  customer_phone: z
    .string()
    .trim()
    .min(8, "Please enter a valid phone number.")
    .max(20),
  vehicle_rego: z.string().trim().min(2, "Please enter the vehicle registration.").max(20),
  vehicle_make: z.string().trim().min(1, "Please enter the vehicle make.").max(60),
  vehicle_model: z.string().trim().min(1, "Please enter the vehicle model.").max(60),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

export const bookingUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  admin_notes: z.string().trim().max(2000).optional(),
});

export type BookingUpdateInput = z.infer<typeof bookingUpdateSchema>;
