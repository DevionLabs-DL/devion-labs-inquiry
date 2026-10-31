/**
 * Review screen: renders the normalized inquiry (the exact data that will be
 * sent) grouped by section, with an Edit button per section.
 * All values are inserted as text nodes — never as HTML.
 */
import { el } from './dom.js';
import { STRINGS } from './strings.js';
import { buildInquiry, formatDate } from './payload.js';
import { STEP } from './navigation.js';

const NP = () => el('span', { class: 'dvn-muted' }, STRINGS.notProvided);

function row(term, value) {
  const content = value === null || value === undefined || value === '' ? NP() : value;
  return [el('dt', {}, term), el('dd', {}, content)];
}

function list(items) {
  if (!items || !items.length) return NP();
  return el('ul', { class: 'dvn-review__list' }, items.map((i) => el('li', {}, i)));
}

function multiline(text) {
  return text ? el('span', { class: 'dvn-prewrap' }, text) : NP();
}

function section(id, title, editStep, ctx, ...content) {
  return el(
    'section',
    { class: 'dvn-review__section', 'aria-labelledby': id },
    el(
      'div',
      { class: 'dvn-review__header' },
      el('h3', { class: 'dvn-review__title', id }, title),
      el(
        'button',
        {
          type: 'button',
          class: 'dvn-btn dvn-btn--link',
          'aria-label': `${STRINGS.edit}: ${title}`,
          on: { click: () => ctx.edit(editStep) },
        },
        STRINGS.edit,
      ),
    ),
    content,
  );
}

export function renderReview(ctx) {
  const inq = buildInquiry(ctx.state, { config: ctx.config, now: ctx.now() });
  const c = inq.consultation;
  const p = inq.project;
  const s = STRINGS.reviewSections;

  const services = section(
    'dvn-rv-services',
    s.services,
    STEP.SERVICES,
    ctx,
    el(
      'dl',
      { class: 'dvn-review__dl' },
      row('Services', list(inq.services.map((x) => x.title))),
      inq.services.length > 1 ? row('Primary service', inq.primaryService ? inq.primaryService.title : STRINGS.primaryNone) : null,
    ),
  );

  const project = section(
    'dvn-rv-project',
    s.project,
    STEP.DETAILS,
    ctx,
    el(
      'dl',
      { class: 'dvn-review__dl' },
      row('Project description', multiline(p.description)),
      row('Main objective', multiline(p.objective)),
      row('Project status', p.status && p.status.label),
      row('Timeline', p.timeline && p.timeline.label),
      row('Budget', p.budget && p.budget.label),
      row('Existing project URL', p.existingUrl),
      row('Additional requirements', multiline(p.additional)),
    ),
  );

  const answers = section(
    'dvn-rv-answers',
    s.answers,
    STEP.DETAILS,
    ctx,
    inq.serviceAnswers.map((g) =>
      el(
        'div',
        { class: 'dvn-review__group' },
        el('h4', { class: 'dvn-review__subtitle' }, g.title),
        el('dl', { class: 'dvn-review__dl' }, g.answers.length ? g.answers.map((a) => row(a.label, a.display.join(', '))) : row('Answers', null)),
      ),
    ),
  );

  const consultation = section(
    'dvn-rv-consultation',
    s.consultation,
    STEP.CONSULTATION,
    ctx,
    el(
      'dl',
      { class: 'dvn-review__dl' },
      row('Preferred date', c.preferredDate ? formatDate(c.preferredDate) : c.datePreference && c.datePreference.label),
      row('Time of day', list(c.timeSlots.map((t) => `${t.label} (${t.range})`))),
      row('Days', c.days && c.days.label),
      row('Time zone', c.timeZone),
      row('Format', c.format && c.format.label),
      row('Flexible', c.flexible ? 'Yes' : 'No'),
    ),
  );

  const contact = section(
    'dvn-rv-contact',
    s.contact,
    STEP.CONTACT,
    ctx,
    el(
      'dl',
      { class: 'dvn-review__dl' },
      row('Name', inq.contact.fullName),
      row('Email', inq.contact.email),
      row('Company', inq.contact.company),
      row('Phone', inq.contact.phone),
      row('Website', inq.contact.website),
      row('Preferred contact', inq.contact.preferredContactMethod && inq.contact.preferredContactMethod.label),
      row('Comments', multiline(inq.contact.comments)),
      row('Privacy notice', inq.consent.privacyNoticeAcknowledged ? 'Acknowledged' : null),
    ),
  );

  return el(
    'section',
    { class: 'dvn-step', 'aria-labelledby': 'dvn-step5-heading' },
    el('h2', { class: 'dvn-step__heading', id: 'dvn-step5-heading', tabindex: '-1' }, STRINGS.reviewHeading),
    el('p', { class: 'dvn-step__intro' }, STRINGS.reviewHelp),
    services,
    project,
    answers,
    consultation,
    contact,
  );
}
