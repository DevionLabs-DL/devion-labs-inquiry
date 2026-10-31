/**
 * Client-side validation.
 *
 * This improves UX only. It is NOT a security boundary: anyone can post to the
 * provider endpoint directly. Forminit validates email/phone/url/date formats
 * server-side; the future Devion API must re-validate every field
 * (Angular Constitution §10.11, Handbook §10.3).
 *
 * All validators are pure: (state, ctx) -> { [fieldKey]: message }.
 */
import { CONFIG } from './config.js';
import { SERVICES, COMMON_QUESTIONS, resolveOptions } from './services.js';
import { getVisibleQuestions, isEmptyValue, fieldKey } from './questionnaire.js';
import { OPTIONS } from './strings.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const E164_RE = /^\+[1-9]\d{6,14}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------- normalizers (also used by the payload builder) ----------

/** Accepts "example.com" or a full URL; returns a normalized https?:// URL or null. */
export function normalizeUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!url.hostname.includes('.') || url.username || url.password) return null;
  return url.href;
}

/** Strips formatting and converts a leading 00 to +. Returns E.164 or null. */
export function normalizePhone(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  let digits = raw.replace(/[\s().-]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;
  return E164_RE.test(digits) ? digits : null;
}

export function isValidEmail(input) {
  const v = String(input || '').trim();
  return v.length <= CONFIG.limits.email && EMAIL_RE.test(v);
}

export function isValidTimeZone(tz) {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Today's date (YYYY-MM-DD) in the given IANA time zone — DST-aware via Intl. */
export function todayInTimeZone(timeZone, now = new Date()) {
  const tz = isValidTimeZone(timeZone) ? timeZone : CONFIG.consultation.defaultTimeZone;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isRealIsoDate(value) {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function isWeekend(isoDate) {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

// ---------- per-question validation ----------

function validateQuestion(question, value, config) {
  const empty = isEmptyValue(value);
  if (question.required && empty) {
    return question.type === 'checkbox' ? 'Select at least one option.' : 'This field is required.';
  }
  if (empty) return null;

  switch (question.type) {
    case 'radio':
    case 'select': {
      const ids = resolveOptions(question, config).map((o) => o.id);
      return ids.includes(value) ? null : 'Select a valid option.';
    }
    case 'checkbox': {
      const ids = resolveOptions(question, config).map((o) => o.id);
      return Array.isArray(value) && value.every((v) => ids.includes(v))
        ? null
        : 'Select valid options.';
    }
    case 'url': {
      if (String(value).length > config.limits.url) return 'This link is too long.';
      return normalizeUrl(value) ? null : 'Enter a valid web address, for example https://example.com.';
    }
    case 'text': {
      const max = question.maxLength || config.limits.shortText;
      return String(value).length > max ? `Please keep this under ${max} characters.` : null;
    }
    case 'textarea': {
      const max = question.maxLength || config.limits.longText;
      return String(value).length > max ? `Please keep this under ${max} characters.` : null;
    }
    default:
      return null;
  }
}

// ---------- steps ----------

export function validateStep1(state) {
  const errors = {};
  if (state.services.length === 0) {
    errors.services = 'Select at least one service.';
  } else if (state.services.length > 1) {
    const ok =
      state.primaryService === 'none' || state.services.includes(state.primaryService);
    if (!ok) errors.primaryService = 'Choose your main priority, or “No primary service”.';
  }
  return errors;
}

export function validateStep2(state, { config = CONFIG } = {}) {
  const errors = {};
  for (const serviceId of state.services) {
    const service = SERVICES.find((s) => s.id === serviceId);
    if (!service) continue;
    const answers = state.answers[serviceId] || {};
    for (const q of getVisibleQuestions(service, answers)) {
      const msg = validateQuestion(q, answers[q.id], config);
      if (msg) errors[fieldKey.service(serviceId, q.id)] = msg;
    }
  }
  for (const q of COMMON_QUESTIONS) {
    const value = state.common[q.id];
    let msg = validateQuestion(q, value, config);
    if (
      !msg &&
      q.id === 'description' &&
      String(value).trim().length < config.limits.minDescription
    ) {
      msg = `Please add a little more detail (at least ${config.limits.minDescription} characters).`;
    }
    if (msg) errors[fieldKey.common(q.id)] = msg;
  }
  return errors;
}

export function validateStep3(state, { config = CONFIG, now = new Date() } = {}) {
  const errors = {};
  const c = state.consultation;
  const k = fieldKey.consultation;

  if (!OPTIONS.datePreference.some((o) => o.id === c.datePreference)) {
    errors[k('datePreference')] = 'Choose a date preference.';
  }
  if (!isValidTimeZone(c.timeZone)) {
    errors[k('timeZone')] = 'Select a valid time zone.';
  }
  if (c.datePreference === 'specific') {
    const today = todayInTimeZone(c.timeZone, now);
    const max = addDays(today, config.consultation.maxDaysAhead);
    if (!c.date) errors[k('date')] = 'Choose a date, or pick another date preference.';
    else if (!isRealIsoDate(c.date)) errors[k('date')] = 'Enter a valid date.';
    else if (c.date < today) errors[k('date')] = 'The preferred date cannot be in the past.';
    else if (c.date > max)
      errors[k('date')] = `Please choose a date within the next ${config.consultation.maxDaysAhead} days.`;
    else if (c.days === 'weekdays' && isWeekend(c.date))
      errors[k('date')] = 'This date is a weekend, but you selected weekdays only.';
    else if (c.days === 'weekends' && !isWeekend(c.date))
      errors[k('date')] = 'This date is a weekday, but you selected weekends only.';
  }
  const slotIds = config.consultation.timeSlots.map((s) => s.id);
  if (!Array.isArray(c.timeSlots) || c.timeSlots.length === 0) {
    errors[k('timeSlots')] = 'Select at least one time of day.';
  } else if (!c.timeSlots.every((id) => slotIds.includes(id))) {
    errors[k('timeSlots')] = 'Select valid times of day.';
  }
  if (!OPTIONS.days.some((o) => o.id === c.days)) {
    errors[k('days')] = 'Choose which days suit you.';
  }
  if (!OPTIONS.format.some((o) => o.id === c.format)) {
    errors[k('format')] = 'Choose a consultation format.';
  }
  return errors;
}

export function validateStep4(state, { config = CONFIG } = {}) {
  const errors = {};
  const c = state.contact;
  const k = fieldKey.contact;
  const name = String(c.fullName || '').trim();

  if (!name) errors[k('fullName')] = 'Enter your full name.';
  else if (name.length < 2) errors[k('fullName')] = 'Enter your full name.';
  else if (name.length > config.limits.name)
    errors[k('fullName')] = `Please keep this under ${config.limits.name} characters.`;

  if (!String(c.email || '').trim()) errors[k('email')] = 'Enter your email address.';
  else if (!isValidEmail(c.email)) errors[k('email')] = 'Enter a valid email address, for example name@company.com.';

  if (String(c.company || '').length > config.limits.shortText)
    errors[k('company')] = `Please keep this under ${config.limits.shortText} characters.`;

  const phoneNeeded = c.contactMethod === 'phone' || state.consultation.format === 'phone';
  if (String(c.phone || '').trim()) {
    if (!normalizePhone(c.phone))
      errors[k('phone')] = 'Enter the number in international format, for example +36 30 123 4567.';
  } else if (phoneNeeded) {
    errors[k('phone')] = 'Add a phone number, since you chose to be contacted by phone.';
  }

  if (String(c.website || '').trim() && !normalizeUrl(c.website))
    errors[k('website')] = 'Enter a valid web address, for example https://example.com.';

  if (c.contactMethod && !OPTIONS.contactMethod.some((o) => o.id === c.contactMethod))
    errors[k('contactMethod')] = 'Select a valid option.';

  if (String(c.comments || '').length > config.limits.longText)
    errors[k('comments')] = `Please keep this under ${config.limits.longText} characters.`;

  if (c.privacyAck !== true)
    errors[k('privacyAck')] = 'Please confirm you have read the privacy notice.';
  return errors;
}

export const STEP_VALIDATORS = Object.freeze({
  1: validateStep1,
  2: validateStep2,
  3: validateStep3,
  4: validateStep4,
});

export function validateStep(step, state, ctx) {
  const fn = STEP_VALIDATORS[step];
  return fn ? fn(state, ctx) : {};
}

/** Full validation before submission; returns the first failing step too. */
export function validateAll(state, ctx) {
  for (const step of [1, 2, 3, 4]) {
    const errors = validateStep(step, state, ctx);
    if (Object.keys(errors).length) return { valid: false, step, errors };
  }
  return { valid: true, step: null, errors: {} };
}
