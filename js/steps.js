/**
 * Step views. Each returns a <section> for the current state.
 * Text inputs update the store without re-rendering (keeps focus and caret);
 * choices that can change the layout call ctx.rerender().
 */
import { el, domId } from './dom.js';
import { icon } from './icons.js';
import { STRINGS, OPTIONS } from './strings.js';
import { SERVICES, COMMON_QUESTIONS, resolveOptions, getService } from './services.js';
import { getVisibleQuestions, progressFor, fieldKey } from './questionnaire.js';
import { renderChoiceGroup, renderSelect, renderInput, renderTextarea, renderCheckbox } from './fields.js';
import { todayInTimeZone, addDays } from './validation.js';

function stepSection(id, heading, intro, ...content) {
  return el(
    'section',
    { class: 'dvn-step', 'aria-labelledby': `${id}-heading` },
    el('h2', { class: 'dvn-step__heading', id: `${id}-heading`, tabindex: '-1' }, heading),
    intro ? el('p', { class: 'dvn-step__intro' }, intro) : null,
    content,
  );
}

/** Renders any question definition bound to a getter/setter. */
function renderQuestion({ key, question, value, setValue, ctx }) {
  const { config } = ctx;
  const base = { key, label: question.label, required: Boolean(question.required), help: question.help };
  switch (question.type) {
    case 'radio':
    case 'checkbox':
      return renderChoiceGroup({
        ...base,
        type: question.type,
        options: resolveOptions(question, config),
        value,
        onChange: (v) => {
          setValue(v);
          ctx.rerender(); // a choice may reveal or hide a follow-up question
        },
      });
    case 'select':
      return renderSelect({ ...base, options: resolveOptions(question, config), value, onChange: setValue });
    case 'textarea':
      return renderTextarea({
        ...base,
        value,
        onInput: setValue,
        onBlur: ctx.onBlur,
        maxLength: question.maxLength || config.limits.longText,
      });
    case 'url':
      return renderInput({
        ...base,
        type: 'url',
        value,
        onInput: setValue,
        onBlur: ctx.onBlur,
        maxLength: config.limits.url,
        attrs: { inputmode: 'url', placeholder: 'https://' },
      });
    default:
      return renderInput({
        ...base,
        type: 'text',
        value,
        onInput: setValue,
        onBlur: ctx.onBlur,
        maxLength: question.maxLength || config.limits.shortText,
      });
  }
}

// ---------------------------------------------------------------- Step 1

export function renderServicesStep(ctx) {
  const { state, store } = ctx;
  const cards = SERVICES.map((s) => {
    const inputId = domId('service', s.id);
    const selected = state.services.includes(s.id);
    return el(
      'label',
      { class: ['dvn-card', selected ? 'dvn-card--selected' : null], for: inputId },
      el('input', {
        type: 'checkbox',
        id: inputId,
        class: 'dvn-card__input',
        value: s.id,
        checked: selected,
        on: {
          change: (e) => {
            store.toggleService(s.id, e.target.checked);
            ctx.rerender(inputId);
          },
        },
      }),
      el('span', { class: 'dvn-card__icon' }, icon(s.icon)),
      el(
        'span',
        { class: 'dvn-card__body' },
        el('span', { class: 'dvn-card__title' }, s.title),
        el('span', { class: 'dvn-card__desc' }, s.description),
      ),
      el('span', { class: 'dvn-card__check', 'aria-hidden': 'true' }, icon('check', { size: 16 })),
    );
  });

  const servicesField = el(
    'fieldset',
    {
      class: ['dvn-field', 'dvn-fieldset'],
      id: domId('services', 'field'),
      'data-field': 'services',
      'aria-describedby': `${domId('services', 'help')} ${domId('services', 'error')}`,
    },
    el('legend', { class: 'dvn-sr-only' }, STRINGS.step1Heading),
    el('p', { class: 'dvn-help', id: domId('services', 'help') }, STRINGS.step1Help),
    el('div', { class: 'dvn-cards' }, cards),
    el('p', { class: 'dvn-error', id: domId('services', 'error'), hidden: true }),
  );

  let primary = null;
  if (state.services.length > 1) {
    primary = el(
      'div',
      { class: 'dvn-panel dvn-reveal' },
      renderChoiceGroup({
        key: 'primaryService',
        type: 'radio',
        label: STRINGS.primaryHeading,
        required: true,
        options: [
          ...state.services.map((id) => ({ id, label: getService(id).title })),
          { id: 'none', label: STRINGS.primaryNone },
        ],
        value: state.primaryService,
        onChange: (v) => store.setPrimaryService(v),
      }),
    );
  }

  return stepSection('dvn-step1', STRINGS.step1Heading, null, servicesField, primary);
}

// ---------------------------------------------------------------- Step 2

function renderServiceGroup(service, ctx) {
  const { state, store } = ctx;
  const answers = state.answers[service.id] || {};
  const expanded = state.expandedGroups.includes(service.id);
  const bodyId = domId('group', service.id);
  const { done, total } = progressFor(service, answers);

  const toggle = el(
    'button',
    {
      type: 'button',
      class: 'dvn-group__toggle',
      id: domId('group-toggle', service.id),
      'aria-expanded': expanded ? 'true' : 'false',
      'aria-controls': bodyId,
      on: {
        click: () => {
          store.setGroupExpanded(service.id, !expanded);
          ctx.rerender(domId('group-toggle', service.id));
        },
      },
    },
    el('span', { class: 'dvn-group__icon' }, icon(service.icon, { size: 20 })),
    el('span', { class: 'dvn-group__title' }, service.title),
    el(
      'span',
      { class: ['dvn-badge', done === total ? 'dvn-badge--done' : null] },
      STRINGS.answeredCount(done, total),
    ),
    el('span', { class: 'dvn-group__chevron' }, icon('chevron', { size: 18 })),
  );

  const body = el(
    'div',
    { class: 'dvn-group__body', id: bodyId, hidden: !expanded },
    getVisibleQuestions(service, answers).map((q) =>
      renderQuestion({
        key: fieldKey.service(service.id, q.id),
        question: q,
        value: answers[q.id],
        setValue: (v) => store.setAnswer(service.id, q.id, v),
        ctx,
      }),
    ),
  );

  return el('div', { class: ['dvn-group', expanded ? 'dvn-group--open' : null] }, el('h3', { class: 'dvn-group__heading' }, toggle), body);
}

export function renderDetailsStep(ctx) {
  const { state, store } = ctx;
  const groups = state.services.map((id) => getService(id)).filter(Boolean).map((s) => renderServiceGroup(s, ctx));
  const common = el(
    'div',
    { class: 'dvn-panel' },
    el('h3', { class: 'dvn-subheading' }, STRINGS.commonHeading),
    COMMON_QUESTIONS.map((q) =>
      renderQuestion({
        key: fieldKey.common(q.id),
        question: q,
        value: state.common[q.id],
        setValue: (v) => store.setCommon(q.id, v),
        ctx,
      }),
    ),
  );
  return stepSection('dvn-step2', STRINGS.step2Heading, STRINGS.step2Help, el('div', { class: 'dvn-groups' }, groups), common);
}

// ---------------------------------------------------------------- Step 3

let cachedZones = null;
function timeZones(defaultZone) {
  if (!cachedZones) {
    let zones = [];
    try {
      zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    } catch {
      zones = [];
    }
    if (!zones.length) zones = ['Europe/Budapest', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'UTC'];
    cachedZones = zones;
  }
  return cachedZones.includes(defaultZone) ? cachedZones : [defaultZone, ...cachedZones];
}

export function renderConsultationStep(ctx) {
  const { state, store, config, now } = ctx;
  const c = state.consultation;
  const k = fieldKey.consultation;
  const today = todayInTimeZone(c.timeZone, now());

  const dateInput =
    c.datePreference === 'specific'
      ? el(
          'div',
          { class: 'dvn-reveal' },
          renderInput({
            key: k('date'),
            label: 'Preferred date',
            required: true,
            type: 'date',
            value: c.date,
            onInput: (v) => store.setConsultation('date', v),
            onBlur: ctx.onBlur,
            attrs: { min: today, max: addDays(today, config.consultation.maxDaysAhead) },
          }),
        )
      : null;

  const datePref = renderChoiceGroup({
    key: k('datePreference'),
    type: 'radio',
    label: 'Preferred date',
    required: true,
    options: OPTIONS.datePreference,
    value: c.datePreference,
    onChange: (v) => {
      store.setConsultation('datePreference', v);
      ctx.rerender(domId(k('datePreference'), v));
    },
    extra: dateInput,
  });

  const slots = renderChoiceGroup({
    key: k('timeSlots'),
    type: 'checkbox',
    label: 'Preferred time of day',
    required: true,
    help: STRINGS.timeSlotsHelp,
    options: config.consultation.timeSlots.map((s) => ({ id: s.id, label: s.label, hint: s.range })),
    value: c.timeSlots,
    onChange: (v) => store.setConsultation('timeSlots', v),
    layout: 'grid',
  });

  const days = renderChoiceGroup({
    key: k('days'),
    type: 'radio',
    label: 'Preferred days',
    required: true,
    help: STRINGS.weekendNote,
    options: OPTIONS.days,
    value: c.days,
    onChange: (v) => store.setConsultation('days', v),
  });

  const zoneId = domId(k('timeZone'));
  const zone = el(
    'div',
    { class: 'dvn-field', id: domId(k('timeZone'), 'field'), 'data-field': k('timeZone') },
    el('label', { class: 'dvn-label', for: zoneId }, STRINGS.timeZoneLabel),
    el(
      'select',
      {
        id: zoneId,
        class: 'dvn-input dvn-select',
        'aria-describedby': domId(k('timeZone'), 'error'),
        on: {
          change: (e) => {
            store.setConsultation('timeZone', e.target.value);
            ctx.rerender(zoneId); // "today" (date min) depends on the zone
          },
        },
      },
      timeZones(config.consultation.defaultTimeZone).map((z) =>
        el('option', { value: z, selected: z === c.timeZone }, z.replace(/_/g, ' ')),
      ),
    ),
    el('p', { class: 'dvn-error', id: domId(k('timeZone'), 'error'), hidden: true }),
  );

  const format = renderChoiceGroup({
    key: k('format'),
    type: 'radio',
    label: 'Consultation format',
    required: true,
    options: OPTIONS.format,
    value: c.format,
    onChange: (v) => store.setConsultation('format', v),
  });

  const flexible = renderCheckbox({
    key: k('flexible'),
    label: STRINGS.flexibleLabel,
    required: false,
    checked: c.flexible,
    onChange: (v) => store.setConsultation('flexible', v),
  });

  const note = el('div', { class: 'dvn-note', role: 'note' }, icon('info', { size: 20 }), el('p', {}, STRINGS.step3Help));

  return stepSection('dvn-step3', STRINGS.step3Heading, null, note, datePref, slots, days, zone, format, flexible);
}

// ---------------------------------------------------------------- Step 4

export function renderContactStep(ctx) {
  const { state, store, config } = ctx;
  const c = state.contact;
  const k = fieldKey.contact;
  const text = (key, label, opts = {}) =>
    renderInput({
      key: k(key),
      label,
      value: c[key],
      onInput: (v) => store.setContact(key, v),
      onBlur: ctx.onBlur,
      maxLength: config.limits.shortText,
      ...opts,
    });

  const privacyLabel = [
    STRINGS.privacyLabelBefore,
    config.privacy.noticeUrl
      ? el('a', { href: config.privacy.noticeUrl, target: '_blank', rel: 'noopener noreferrer' }, STRINGS.privacyLinkText)
      : el('span', {}, STRINGS.privacyLinkText, STRINGS.privacyNotConfigured),
    STRINGS.privacyLabelAfter,
  ];

  return stepSection(
    'dvn-step4',
    STRINGS.step4Heading,
    null,
    el(
      'div',
      { class: 'dvn-grid-2' },
      text('fullName', 'Full name', { required: true, autocomplete: 'name', maxLength: config.limits.name }),
      text('email', 'Email address', { required: true, type: 'email', autocomplete: 'email', maxLength: config.limits.email }),
      text('company', 'Company name', { autocomplete: 'organization' }),
      text('phone', 'Phone number', {
        type: 'tel',
        autocomplete: 'tel',
        help: 'International format, for example +36 30 123 4567.',
        attrs: { inputmode: 'tel' },
      }),
    ),
    text('website', 'Company website', {
      type: 'url',
      autocomplete: 'url',
      maxLength: config.limits.url,
      attrs: { inputmode: 'url', placeholder: 'https://' },
    }),
    renderChoiceGroup({
      key: k('contactMethod'),
      type: 'radio',
      label: 'Preferred contact method',
      required: false,
      options: OPTIONS.contactMethod,
      value: c.contactMethod,
      onChange: (v) => store.setContact('contactMethod', v),
      layout: 'grid',
    }),
    renderTextarea({
      key: k('comments'),
      label: 'Additional comments',
      required: false,
      value: c.comments,
      onInput: (v) => store.setContact('comments', v),
      onBlur: ctx.onBlur,
      maxLength: config.limits.longText,
      rows: 3,
    }),
    renderCheckbox({
      key: k('privacyAck'),
      label: privacyLabel,
      required: true,
      checked: c.privacyAck,
      onChange: (v) => store.setContact('privacyAck', v),
    }),
  );
}
