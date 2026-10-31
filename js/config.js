/**
 * Runtime configuration. Everything that may differ between environments or
 * that a non-developer may want to change lives here.
 *
 * SECURITY: nothing in this file is secret. The Forminit form ID is public by
 * design (it appears in every page that submits to the form). Never add API
 * keys, SMTP credentials or tokens here — everything shipped to the browser is
 * readable by anyone (Angular Constitution §10.6 applies to all frontend code).
 */
export const CONFIG = Object.freeze({
  /** Bump when the payload shape changes; the backend migration relies on it. */
  schemaVersion: '1.0',
  formVersion: '0.1.0',
  locale: 'en',

  provider: Object.freeze({
    /** 'forminit' | 'custom-api' */
    type: 'forminit',
    /** Paste the Forminit form ID here. Empty = form shows "not configured". */
    formId: '0dn3n6g6cyn',
    endpointBase: 'https://forminit.com/f/',
    /** Honeypot field name; must match Forminit Form Settings → Honeypot. */
    honeypotField: '_gotcha',
    /** Abort and report an uncertain outcome after this many milliseconds. */
    timeoutMs: 15000,
    /** Forminit Public mode: 1 request per 5 seconds per IP. */
    rateLimitWaitMs: 6000,
  }),

  /** Used only when provider.type === 'custom-api' (future Devion backend). */
  customApi: Object.freeze({
    endpoint: '',
  }),

  contact: Object.freeze({
    /** Shown to visitors as a fallback when submission fails. */
    fallbackEmail: 'admin@devion-labs.com',
  }),

  privacy: Object.freeze({
    /** REQUIRED before real client traffic. Empty = link shown as "not yet available". */
    noticeUrl: '',
    /** Recorded with the consent so we know which notice text was accepted. */
    noticeVersion: 'draft-2026-10',
  }),

  consultation: Object.freeze({
    defaultTimeZone: 'Europe/Budapest',
    /** Configurable time-of-day windows, interpreted in the visitor's chosen time zone. */
    timeSlots: Object.freeze([
      Object.freeze({ id: 'morning', label: 'Morning', range: '09:00–12:00' }),
      Object.freeze({ id: 'afternoon', label: 'Afternoon', range: '12:00–17:00' }),
      Object.freeze({ id: 'after-hours', label: 'After business hours', range: '17:00–21:00' }),
    ]),
    /** How far ahead a preferred date may be chosen. */
    maxDaysAhead: 180,
  }),

  /** Configurable budget ranges (optional question). */
  budgetRanges: Object.freeze([
    Object.freeze({ id: 'lt-2k', label: 'Under €2,000' }),
    Object.freeze({ id: '2k-5k', label: '€2,000 – €5,000' }),
    Object.freeze({ id: '5k-15k', label: '€5,000 – €15,000' }),
    Object.freeze({ id: '15k-50k', label: '€15,000 – €50,000' }),
    Object.freeze({ id: 'gt-50k', label: 'Over €50,000' }),
    Object.freeze({ id: 'not-sure', label: 'Not sure yet' }),
    Object.freeze({ id: 'discuss', label: 'Prefer to discuss' }),
  ]),

  limits: Object.freeze({
    shortText: 200,
    longText: 3000,
    name: 100,
    email: 254,
    url: 2048,
    minDescription: 10,
  }),
});

/** True when the active provider has the configuration it needs to submit. */
export function isProviderConfigured(config = CONFIG) {
  if (config.provider.type === 'forminit') {
    return /^[A-Za-z0-9_-]{4,64}$/.test(config.provider.formId);
  }
  if (config.provider.type === 'custom-api') {
    return /^https:\/\/\S+$/.test(config.customApi.endpoint);
  }
  return false;
}
