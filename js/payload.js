/**
 * Normalized inquiry payload — the provider-independent data contract.
 *
 * Adapters translate this object into each provider's wire format. The future
 * Devion API should accept this shape (schemaVersion-gated) so the frontend
 * does not change when the backend arrives. See docs/BACKEND-MIGRATION.md.
 */
import { CONFIG } from './config.js';
import { SERVICES, COMMON_QUESTIONS, getService, optionLabel } from './services.js';
import { getVisibleQuestions, isEmptyValue } from './questionnaire.js';
import { normalizePhone, normalizeUrl } from './validation.js';
import { OPTIONS, labelFor } from './strings.js';

const clean = (v) => String(v ?? '').trim();
const choice = (list, id) => (id ? { id, label: labelFor(list, id) || id } : null);

function questionValue(question, value, config) {
  if (question.type === 'checkbox') {
    const ids = Array.isArray(value) ? value : [];
    return { value: ids, display: ids.map((id) => optionLabel(question, id, config)) };
  }
  if (question.type === 'radio' || question.type === 'select') {
    return { value, display: [optionLabel(question, value, config)] };
  }
  if (question.type === 'url') {
    const url = normalizeUrl(value) || clean(value);
    return { value: url, display: [url] };
  }
  return { value: clean(value), display: [clean(value)] };
}

export function buildServiceAnswers(state, config = CONFIG) {
  return state.services
    .map((serviceId) => getService(serviceId))
    .filter(Boolean)
    .map((service) => {
      const answers = state.answers[service.id] || {};
      const items = getVisibleQuestions(service, answers)
        .filter((q) => !isEmptyValue(answers[q.id]))
        .map((q) => ({
          questionId: q.id,
          label: q.label,
          type: q.type,
          ...questionValue(q, answers[q.id], config),
        }));
      return { serviceId: service.id, title: service.title, answers: items };
    });
}

export function buildInquiry(state, { config = CONFIG, now = new Date() } = {}) {
  const services = state.services
    .map((id) => SERVICES.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => ({ id: s.id, title: s.title }));

  let primaryService = null;
  if (services.length === 1) primaryService = services[0];
  else if (state.primaryService && state.primaryService !== 'none') {
    primaryService = services.find((s) => s.id === state.primaryService) || null;
  }

  const commonQ = Object.fromEntries(COMMON_QUESTIONS.map((q) => [q.id, q]));
  const common = state.common;
  const c = state.consultation;
  const contact = state.contact;

  return {
    schemaVersion: config.schemaVersion,
    formVersion: config.formVersion,
    submissionId: state.submissionId,
    submittedAt: now.toISOString(),
    locale: config.locale,

    services,
    primaryService,
    primaryServiceChoice: services.length > 1 ? state.primaryService || 'none' : null,
    serviceAnswers: buildServiceAnswers(state, config),

    project: {
      description: clean(common.description),
      objective: clean(common.objective),
      status: common.status
        ? { id: common.status, label: optionLabel(commonQ.status, common.status, config) }
        : null,
      timeline: common.timeline
        ? { id: common.timeline, label: optionLabel(commonQ.timeline, common.timeline, config) }
        : null,
      budget: common.budget
        ? { id: common.budget, label: optionLabel(commonQ.budget, common.budget, config) }
        : null,
      existingUrl: normalizeUrl(common.existing_url),
      additional: clean(common.additional) || null,
    },

    consultation: {
      datePreference: choice(OPTIONS.datePreference, c.datePreference),
      preferredDate: c.datePreference === 'specific' && c.date ? c.date : null,
      timeSlots: config.consultation.timeSlots
        .filter((s) => c.timeSlots.includes(s.id))
        .map((s) => ({ id: s.id, label: s.label, range: s.range })),
      days: choice(OPTIONS.days, c.days),
      timeZone: c.timeZone,
      format: choice(OPTIONS.format, c.format),
      flexible: Boolean(c.flexible),
    },

    contact: {
      fullName: clean(contact.fullName),
      email: clean(contact.email).toLowerCase(),
      company: clean(contact.company) || null,
      phone: normalizePhone(contact.phone),
      website: normalizeUrl(contact.website),
      preferredContactMethod: choice(OPTIONS.contactMethod, contact.contactMethod),
      comments: clean(contact.comments) || null,
    },

    consent: {
      privacyNoticeAcknowledged: contact.privacyAck === true,
      noticeVersion: config.privacy.noticeVersion,
      noticeUrl: config.privacy.noticeUrl || null,
      acceptedAt: state.consentAcceptedAt || null,
    },
  };
}

/** Human-readable date, rendered in UTC so the calendar date never shifts. */
export function formatDate(isoDate, locale = 'en-US') {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** Plain-text summary used as the readable body of the notification email. */
export function buildSummaryText(inquiry) {
  const lines = [];
  const push = (s = '') => lines.push(s);
  const c = inquiry.consultation;

  push('New Project Inquiry — Devion Labs');
  push(`Reference: ${inquiry.submissionId}`);
  push();
  push(`Client: ${inquiry.contact.fullName}`);
  push(`Email: ${inquiry.contact.email}`);
  if (inquiry.contact.company) push(`Company: ${inquiry.contact.company}`);
  if (inquiry.contact.phone) push(`Phone: ${inquiry.contact.phone}`);
  if (inquiry.contact.website) push(`Website: ${inquiry.contact.website}`);
  if (inquiry.contact.preferredContactMethod)
    push(`Preferred contact: ${inquiry.contact.preferredContactMethod.label}`);
  push();
  push('Selected Services:');
  inquiry.services.forEach((s) => push(`- ${s.title}`));
  if (inquiry.services.length > 1) {
    push(`Primary service: ${inquiry.primaryService ? inquiry.primaryService.title : 'No primary service'}`);
  }
  push();
  push('Project:');
  push(inquiry.project.description);
  push();
  push('Objective:');
  push(inquiry.project.objective);
  if (inquiry.project.status) push(`Status: ${inquiry.project.status.label}`);
  if (inquiry.project.timeline) push(`Timeline: ${inquiry.project.timeline.label}`);
  if (inquiry.project.budget) push(`Budget: ${inquiry.project.budget.label}`);
  if (inquiry.project.existingUrl) push(`Existing project: ${inquiry.project.existingUrl}`);
  if (inquiry.project.additional) {
    push('Additional requirements:');
    push(inquiry.project.additional);
  }
  push();
  push('Consultation:');
  if (c.preferredDate) push(`- Preferred date: ${formatDate(c.preferredDate)}`);
  else if (c.datePreference) push(`- ${c.datePreference.label}`);
  if (c.timeSlots.length)
    push(`- ${c.timeSlots.map((s) => `${s.label} (${s.range})`).join(' or ')}`);
  if (c.days) push(`- ${c.days.label}`);
  push(`- ${c.timeZone}`);
  if (c.format) push(`- ${c.format.label}`);
  push(`- Flexible: ${c.flexible ? 'Yes' : 'No'}`);

  inquiry.serviceAnswers.forEach((group) => {
    push();
    push(`${group.title}:`);
    if (!group.answers.length) push('- (no answers)');
    group.answers.forEach((a) => push(`- ${a.label} ${a.display.join(', ')}`));
  });

  if (inquiry.contact.comments) {
    push();
    push('Comments:');
    push(inquiry.contact.comments);
  }
  push();
  push(
    `Privacy notice acknowledged: ${inquiry.consent.privacyNoticeAcknowledged ? 'Yes' : 'No'} (version ${inquiry.consent.noticeVersion}${inquiry.consent.acceptedAt ? `, ${inquiry.consent.acceptedAt}` : ''})`,
  );
  return lines.join('\n');
}
