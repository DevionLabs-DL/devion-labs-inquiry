/**
 * Forminit adapter (https://forminit.com/docs/submit-form-api/).
 *
 * - Public mode: no API key. Never add X-API-KEY here — keys belong server-side.
 * - Sent as multipart FormData with `fi-{blockType}-{name}` field names, which
 *   is a CORS "simple" request (no preflight) and carries the honeypot field.
 * - Forminit validates email, phone (E.164), url and date blocks server-side.
 * - Every submission also carries `inquiry_json` (the full normalized payload)
 *   and `summary` (readable text) so nothing is lost if a block is renamed.
 */
import {
  InquirySubmissionAdapter,
  SubmissionStatus,
  fetchWithTimeout,
  readJsonSafely,
  isAbortError,
} from './adapter.js';
import { buildSummaryText } from '../payload.js';

const safeName = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '_');
const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** Maps question types to Forminit block types. */
const BLOCK_TYPE = Object.freeze({
  radio: 'radio',
  select: 'select',
  checkbox: 'checkbox',
  url: 'url',
  text: 'text',
  textarea: 'text',
});

/**
 * Builds the Forminit FormData for a normalized inquiry.
 * Exported for tests and for inspecting exactly what is sent.
 */
export function toForminitFormData(inquiry, { honeypotField = '_gotcha', honeypotValue = '' } = {}) {
  const fd = new FormData();
  const add = (type, name, value) => {
    if (value === null || value === undefined) return;
    const v = typeof value === 'string' ? value.trim() : String(value);
    if (v === '') return;
    fd.append(`fi-${type}-${safeName(name)}`, v);
  };
  const addMany = (type, name, values) => (values || []).forEach((v) => add(type, name, v));

  // Sender (contact card in the Forminit inbox; Reply-to for notifications)
  fd.append('fi-sender-fullName', inquiry.contact.fullName);
  fd.append('fi-sender-email', inquiry.contact.email);
  if (inquiry.contact.company) fd.append('fi-sender-company', inquiry.contact.company);
  if (inquiry.contact.phone) fd.append('fi-sender-phone', inquiry.contact.phone); // E.164 only

  // Readable summary first, so it leads the notification email
  add('text', 'summary', buildSummaryText(inquiry));
  add('text', 'reference', inquiry.submissionId);

  // Services
  addMany('checkbox', 'services', inquiry.services.map((s) => s.title));
  if (inquiry.services.length > 1) {
    add('radio', 'primary_service', inquiry.primaryService ? inquiry.primaryService.title : 'No primary service');
  }

  // Service-specific answers: `<serviceId>__<questionId>`
  for (const group of inquiry.serviceAnswers) {
    for (const a of group.answers) {
      const type = BLOCK_TYPE[a.type] || 'text';
      const name = `${group.serviceId}__${a.questionId}`;
      if (type === 'checkbox') addMany(type, name, a.display);
      else add(type, name, type === 'url' ? a.value : a.display[0]);
    }
  }

  // Project
  const p = inquiry.project;
  add('text', 'project_description', p.description);
  add('text', 'main_objective', p.objective);
  add('radio', 'project_status', p.status && p.status.label);
  add('radio', 'timeline', p.timeline && p.timeline.label);
  add('select', 'budget', p.budget && p.budget.label);
  add('url', 'existing_project_url', p.existingUrl);
  add('text', 'additional_requirements', p.additional);

  // Consultation
  const c = inquiry.consultation;
  add('radio', 'date_preference', c.datePreference && c.datePreference.label);
  add('date', 'preferred_date', c.preferredDate);
  addMany('checkbox', 'time_of_day', c.timeSlots.map((s) => `${s.label} (${s.range})`));
  add('radio', 'preferred_days', c.days && c.days.label);
  add('text', 'time_zone', c.timeZone);
  add('radio', 'meeting_format', c.format && c.format.label);
  add('radio', 'flexible', c.flexible ? 'Yes' : 'No');

  // Contact extras
  add('url', 'company_website', inquiry.contact.website);
  add('radio', 'preferred_contact_method', inquiry.contact.preferredContactMethod && inquiry.contact.preferredContactMethod.label);
  add('text', 'comments', inquiry.contact.comments);

  // Consent record (Handbook §10.6: stored, timestamped, versioned)
  add('checkbox', 'privacy_acknowledged', inquiry.consent.privacyNoticeAcknowledged ? 'Yes' : 'No');
  add('text', 'privacy_notice_version', inquiry.consent.noticeVersion);
  add('text', 'consent_accepted_at', inquiry.consent.acceptedAt);

  // Metadata + full machine-readable record for the future backend import
  add('text', 'schema_version', inquiry.schemaVersion);
  add('text', 'form_version', inquiry.formVersion);
  add('text', 'submitted_at', inquiry.submittedAt);
  add('text', 'inquiry_json', JSON.stringify(inquiry));

  // Honeypot: always present, empty for humans. Never prefixed with fi-.
  fd.append(honeypotField, honeypotValue);
  return fd;
}

export class ForminitAdapter extends InquirySubmissionAdapter {
  constructor({
    formId,
    endpointBase = 'https://forminit.com/f/',
    timeoutMs = 15000,
    rateLimitWaitMs = 6000,
    honeypotField = '_gotcha',
    fetchImpl = (...args) => globalThis.fetch(...args),
  }) {
    super();
    this.formId = formId;
    this.endpoint = `${endpointBase}${encodeURIComponent(formId || '')}`;
    this.timeoutMs = timeoutMs;
    this.rateLimitWaitMs = rateLimitWaitMs;
    this.honeypotField = honeypotField;
    this.fetchImpl = fetchImpl;
  }

  async submit(inquiry, { honeypotValue = '' } = {}) {
    if (!this.formId) return { status: SubmissionStatus.NOT_CONFIGURED };

    const body = toForminitFormData(inquiry, { honeypotField: this.honeypotField, honeypotValue });
    let response;
    try {
      response = await fetchWithTimeout(
        this.fetchImpl,
        this.endpoint,
        {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body,
          credentials: 'omit',
          mode: 'cors',
        },
        this.timeoutMs,
      );
    } catch (err) {
      if (isAbortError(err)) return { status: SubmissionStatus.UNCERTAIN, code: 'TIMEOUT' };
      // Offline: the request never left the browser, so nothing was stored.
      if (isOffline()) return { status: SubmissionStatus.NETWORK_ERROR, code: 'OFFLINE' };
      // Online but fetch failed: the multipart POST needs no CORS preflight, so it
      // may have reached Forminit even if the browser blocked reading the reply.
      return { status: SubmissionStatus.UNCERTAIN, code: 'RESPONSE_UNREADABLE' };
    }

    const json = await readJsonSafely(response);
    const code = json && typeof json.error === 'string' ? json.error : `HTTP_${response.status}`;

    if (response.ok && json && json.success === true) {
      const reference = json.submission && json.submission.hashId ? String(json.submission.hashId) : undefined;
      return { status: SubmissionStatus.SUCCESS, reference };
    }
    if (response.ok) {
      // 2xx but not the documented success body: the record may exist.
      return { status: SubmissionStatus.UNCERTAIN, code: 'UNEXPECTED_RESPONSE' };
    }
    if (response.status === 429) {
      return { status: SubmissionStatus.RATE_LIMITED, code, retryAfterMs: this.rateLimitWaitMs };
    }
    if (response.status === 400 || response.status === 422) {
      return { status: SubmissionStatus.REJECTED, code };
    }
    // 401/403/404/415/5xx: configuration, plan limit, or provider outage.
    return { status: SubmissionStatus.UNAVAILABLE, code };
  }
}
