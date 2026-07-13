# Gurkha Automotive — Website & Booking System

A full-stack website and online booking system for **Gurkha Automotive**, an
automotive garage at 23 Whitehill Ave, Sunshine North VIC 3020, Australia.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Supabase
(Postgres + Auth), and Resend for transactional email. Designed to deploy on
Vercel.

---

## 1. What's included

- **Public site:** Home, Services, About, Contact, Book Appointment
- **Booking system:** service + calendar date + live time-slot picker,
  customer & vehicle details, saved to Supabase with status `pending`
- **Admin dashboard:** secure login (Supabase Auth), view/filter bookings,
  confirm / complete / cancel, add internal notes, at-a-glance stats
  (today, upcoming, pending, completed, cancelled)
- **Transactional email (Resend):** booking received (customer), new
  booking (garage), booking confirmed (customer), booking cancelled
  (customer)
- **Database:** SQL migrations with foreign keys, constraints, indexes and
  Row Level Security policies
- Responsive, production-quality UI (desktop, tablet, mobile)

---

## 2. Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Row Level Security)
- Resend (transactional email)
- Deployed on Vercel

No WordPress, no Firebase, no Python.

---

## 3. Prerequisites

- **Node.js 18.18 or newer** — [nodejs.org](https://nodejs.org)
  Check your version:
  ```bash
  node -v
  ```
- A free [Supabase](https://supabase.com) account
- A free [Resend](https://resend.com) account
- A [GitHub](https://github.com) account (for deployment)
- A [Vercel](https://vercel.com) account (for deployment)

---

## 4. Local setup

### 4.1 Install dependencies

```bash
npm install
```

### 4.2 Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Choose a name (e.g. `gurkha-automotive`), a database password, and a
   region close to Australia (e.g. Sydney).
3. Once the project is ready, open **Project Settings → API**. You'll need:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret —
     never expose it in client-side code)

### 4.3 Import the database schema

Open the Supabase Dashboard → **SQL Editor** → **New query**, then run the
three migration files **in order**, copy-pasting the contents of each:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_seed.sql`

(Alternatively, if you use the [Supabase CLI](https://supabase.com/docs/guides/cli):
`supabase link` your project, then `supabase db push`.)

This creates the `services`, `business_hours`, `blocked_dates` and
`bookings` tables with Row Level Security enabled, and seeds the opening
hours and a starter list of services.

### 4.4 Create your admin user

The admin dashboard uses Supabase Auth — there is no separate custom login
system. Create an admin account in the Supabase Dashboard:

1. Go to **Authentication → Users → Add user → Create new user**.
2. Enter the admin's email and a password, and confirm the user (tick
   "Auto Confirm User" or confirm via the email Supabase sends).
3. Use these credentials to sign in at `/admin/login`.

You can add more admin users the same way — every authenticated user has
full access to the bookings dashboard (there's no separate customer login).

### 4.5 Configure Resend

1. Sign up at [resend.com](https://resend.com) and create an **API key**
   (Dashboard → API Keys) → this is `RESEND_API_KEY`.
2. Add and verify a sending domain (Dashboard → Domains) so you can send
   from an address like `bookings@yourdomain.com`. Until you verify a
   domain, you can test with Resend's shared `onboarding@resend.dev`
   sender, but production email should use your own domain.
3. Decide the garage's notification inbox — the address that receives
   "new booking" and contact-form emails — this is
   `GARAGE_NOTIFICATION_EMAIL`.

### 4.6 Configure environment variables

Copy the example file and fill in the values you collected above:

```bash
cp .env.example .env.local
```

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL="Gurkha Automotive <bookings@yourdomain.com>"
GARAGE_NOTIFICATION_EMAIL=info@yourdomain.com

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.local` is already in `.gitignore` — never commit real secrets.

### 4.7 Run the app

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). The admin dashboard
is at [http://localhost:3000/admin/login](http://localhost:3000/admin/login).

---

## 5. Project structure

```
src/
  app/
    page.tsx                 Home
    services/page.tsx        Services
    about/page.tsx            About
    contact/page.tsx          Contact (+ enquiry form)
    book/page.tsx              Book Appointment
    admin/
      login/page.tsx           Admin Login
      dashboard/                Admin Dashboard (protected)
    api/
      bookings/route.ts         POST create booking
      bookings/[id]/route.ts    PATCH update status/notes (admin)
      availability/route.ts     GET open time slots
      contact/route.ts          POST contact form
  components/                  UI components
  lib/
    supabase/                  browser / server / admin Supabase clients
    email.ts, email-templates.ts   Resend integration
    validation.ts               Zod schemas
    availability.ts             slot-generation logic
    constants.ts                 business info, hours
  middleware.ts                 protects /admin/dashboard
supabase/
  migrations/                   SQL schema, RLS, seed data
```

---

## 6. How booking + email works

1. Customer fills in the booking form. The client calls
   `GET /api/availability` to show only real open time slots (based on
   opening hours, existing bookings and blocked dates).
2. On submit, `POST /api/bookings` re-validates everything server-side
   (Zod schema, opening hours, no double-booking) and inserts the row with
   `status = 'pending'` using the Supabase **service role** key (bookings
   have no public RLS policy, so all writes go through this validated API
   route rather than directly from the browser).
3. Two emails send via Resend: **booking received** (customer) and
   **new booking** (garage inbox).
4. In the admin dashboard, confirming or cancelling a booking calls
   `PATCH /api/bookings/[id]`, which updates the row (as the signed-in
   admin, enforced by Row Level Security) and sends the matching
   **booking confirmed** or **booking cancelled** email to the customer.

---

## 7. Deploy

### 7.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — Gurkha Automotive"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gurkha-automotive.git
git push -u origin main
```

### 7.2 Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub
   repository.
2. Framework preset: **Next.js** (auto-detected).
3. Add the same environment variables from `.env.local` under
   **Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `GARAGE_NOTIFICATION_EMAIL`
   - `NEXT_PUBLIC_SITE_URL` → set to your production URL, e.g.
     `https://gurkha-automotive.vercel.app` or your custom domain
4. Click **Deploy**.
5. In Supabase → **Authentication → URL Configuration**, add your
   production URL to the allowed Site URL / Redirect URLs list.

---

## 8. Editing business content

- Business name, address, phone and opening hours live in
  `src/lib/constants.ts`.
- Services, pricing and durations can be managed directly in the
  Supabase `services` table (Table Editor or SQL). A future enhancement
  would be a dedicated admin UI for services — see below.
- The **About** page includes a clearly marked placeholder block for the
  workshop's history/team bios — replace it with real content when
  available. No reviews or testimonials are included, since none were
  supplied; add genuine customer reviews if/when you have them.

---

## 9. Notes & possible enhancements

- Admin management UI for `services`, `business_hours` and
  `blocked_dates` currently lives in Supabase's Table Editor; the SQL
  schema fully supports building an in-app UI for these later.
- Bookings currently allow scheduling up to 60 days ahead (see
  `src/components/Calendar.tsx`) — adjust as needed.
- For SMS reminders or calendar sync, consider adding a provider (e.g.
  Twilio) and a scheduled Vercel Cron job / Supabase Edge Function.
