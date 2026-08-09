import { BUSINESS } from "@/lib/constants";

/**
 * Every piece of admin-editable copy on the public site.
 *
 * This file is the single source of truth for three things at once:
 *   1. the fallback wording, used whenever the database has no value
 *   2. the labels and help text shown on /admin/dashboard/content
 *   3. which fields exist at all
 *
 * Keeping them together is deliberate — if the defaults lived in a SQL
 * seed instead, the copy would exist in two places and drift the first
 * time anyone edited one of them.
 *
 * To add a new editable field: add an entry here, then read it on the
 * page with content("section.field"). No migration needed — the
 * site_content table is keyed by (section, field), not by column.
 */

export type ContentFieldType = "text" | "textarea";

export interface ContentField {
  field: string;
  label: string;
  type: ContentFieldType;
  /** Shown under the input in the admin form. */
  helper?: string;
  default: string;
}

export interface ContentSection {
  section: string;
  title: string;
  description: string;
  fields: ContentField[];
}

export const CONTENT_SECTIONS: ContentSection[] = [
  {
    section: "home",
    title: "Home Page",
    description: "The headings and wording on the front page.",
    fields: [
      {
        field: "hero_eyebrow",
        label: "Hero — small label above heading",
        type: "text",
        default: "Sunshine North, VIC",
      },
      {
        field: "hero_heading",
        label: "Hero — main heading",
        type: "textarea",
        helper: "Press Enter to start a new line. The red full stop is added automatically.",
        default: "No upsell. No surprises.\nJust honest work",
      },
      {
        field: "hero_subtext",
        label: "Hero — paragraph",
        type: "textarea",
        default: `${BUSINESS.name} services, inspects and repairs vehicles for the local community. Book your appointment online in a couple of minutes.`,
      },
      {
        field: "features_eyebrow",
        label: "Why us — small label",
        type: "text",
        default: `Why ${BUSINESS.name}`,
      },
      {
        field: "features_heading",
        label: "Why us — heading",
        type: "text",
        default: "Reliable work, fair pricing",
      },
      { field: "feature_1_title", label: "Feature 1 — title", type: "text", default: "Straight Answers" },
      {
        field: "feature_1_body",
        label: "Feature 1 — text",
        type: "textarea",
        default:
          "We explain what your vehicle needs in plain language before any work starts — no surprise charges.",
      },
      { field: "feature_2_title", label: "Feature 2 — title", type: "text", default: "Local & Independent" },
      {
        field: "feature_2_body",
        label: "Feature 2 — text",
        type: "textarea",
        default:
          "A local Sunshine North workshop, not a franchise call centre. You deal directly with the people doing the work.",
      },
      { field: "feature_3_title", label: "Feature 3 — title", type: "text", default: "All Makes & Models" },
      {
        field: "feature_3_body",
        label: "Feature 3 — text",
        type: "textarea",
        default:
          "From daily runabouts to family SUVs, our techs work across a wide range of makes and models.",
      },
      { field: "feature_4_title", label: "Feature 4 — title", type: "text", default: "Book Online, Anytime" },
      {
        field: "feature_4_body",
        label: "Feature 4 — text",
        type: "textarea",
        default:
          "Pick a service, choose a time that suits you, and get instant confirmation by email.",
      },
      {
        field: "services_eyebrow",
        label: "Services preview — small label",
        type: "text",
        default: "Popular Services",
      },
      {
        field: "services_heading",
        label: "Services preview — heading",
        type: "text",
        default: "What we can help with",
      },
      {
        field: "workshop_eyebrow",
        label: "Workshop address — small label",
        type: "text",
        default: "Visit Our Workshop",
      },
      {
        field: "testimonials_eyebrow",
        label: "Reviews — small label",
        type: "text",
        default: "What Our Customers Say",
      },
      {
        field: "testimonials_heading",
        label: "Reviews — heading",
        type: "text",
        default: "Trusted by drivers across Melbourne's west",
      },
      {
        field: "cta_heading",
        label: "Bottom banner — heading",
        type: "text",
        default: "Ready to book your vehicle in?",
      },
      {
        field: "cta_subtext",
        label: "Bottom banner — text",
        type: "textarea",
        default: "Pick a service and time that works for you — takes about two minutes.",
      },
    ],
  },
  {
    section: "services",
    title: "Services Page",
    description: "Wording around the service list. The services themselves are edited under Manage Services.",
    fields: [
      { field: "hero_eyebrow", label: "Header — small label", type: "text", default: "What We Offer" },
      { field: "hero_heading", label: "Header — main heading", type: "text", default: "Our Services" },
      {
        field: "hero_subtext",
        label: "Header — paragraph",
        type: "textarea",
        default:
          "Every job starts with a straightforward assessment. If anything extra is needed, we'll always talk it through with you first.",
      },
      {
        field: "empty_message",
        label: "Message when no services are listed",
        type: "textarea",
        helper: "Only shown if every service is hidden.",
        default: "Services are being updated. Please call us to check availability.",
      },
      {
        field: "cta_heading",
        label: "Bottom panel — heading",
        type: "text",
        default: "Not sure what your vehicle needs?",
      },
      {
        field: "cta_subtext",
        label: "Bottom panel — text",
        type: "textarea",
        default:
          "Book a diagnostic check or give us a call and we'll point you in the right direction.",
      },
    ],
  },
  {
    section: "about",
    title: "About Page",
    description: "Your story and what you work on.",
    fields: [
      { field: "hero_eyebrow", label: "Header — small label", type: "text", default: "About Us" },
      { field: "hero_heading", label: "Header — main heading", type: "text", default: BUSINESS.name },
      { field: "approach_heading", label: "First section — heading", type: "text", default: "Our Approach" },
      {
        field: "approach_body",
        label: "First section — paragraphs",
        type: "textarea",
        helper: "Leave a blank line between paragraphs.",
        default: `${BUSINESS.name} is an independent automotive workshop based in Sunshine North, servicing the local community and surrounding western suburbs of Melbourne. We work on a wide range of makes and models, from routine servicing through to inspections, brakes, tyres and diagnostics.\n\nWe believe in explaining what a vehicle actually needs, in plain language, before any work begins — and getting the owner's sign-off on anything beyond the original job.`,
      },
      {
        field: "work_on_heading",
        label: "Second section — heading",
        type: "text",
        default: "What We Work On",
      },
      {
        field: "work_on_items",
        label: "Second section — list items",
        type: "textarea",
        helper: "One item per line. Add or remove lines to change the list.",
        default:
          "Passenger cars\nSUVs & 4WDs\nLight commercial vehicles\nPetrol & diesel engines\nLogbook servicing\nPre-purchase inspections",
      },
    ],
  },
  {
    section: "contact",
    title: "Contact Page",
    description: "Headings only — the address, phone and email are set in the site configuration.",
    fields: [
      { field: "hero_eyebrow", label: "Header — small label", type: "text", default: "Get In Touch" },
      { field: "hero_heading", label: "Header — main heading", type: "text", default: "Contact Us" },
      {
        field: "details_heading",
        label: "Workshop details — heading",
        type: "text",
        default: "Workshop Details",
      },
    ],
  },
];

/** Flat "section.field" -> default text, built once at module load. */
export const CONTENT_DEFAULTS: Record<string, string> = Object.fromEntries(
  CONTENT_SECTIONS.flatMap((section) =>
    section.fields.map((field) => [`${section.section}.${field.field}`, field.default])
  )
);

export function getContentDefault(key: string): string {
  return CONTENT_DEFAULTS[key] ?? "";
}
