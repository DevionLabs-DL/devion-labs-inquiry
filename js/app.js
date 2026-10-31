/**
 * Application entry: mounts the wizard into any element with
 * `data-devion-inquiry`, wires navigation, validation display and submission.
 */
import { CONFIG } from './config.js';
import { STRINGS } from './strings.js';
import { el, clear, domId } from './dom.js';
import { icon } from './icons.js';
import { createStore, createInitialState } from './state.js';
import { validateStep } from './validation.js';
import { createWizard, STEP, VISIBLE_STEP_COUNT, visibleStepFor } from './navigation.js';
import { renderServicesStep, renderDetailsStep, renderConsultationStep, renderContactStep } from './steps.js';
import { renderReview } from './review.js';
import { setFieldError, focusField } from './fields.js';
import { buildInquiry } from './payload.js';
import { createSubmissionController } from './submission.js';
import { SubmissionStatus } from './adapters/adapter.js';

const RENDERERS = {
  [STEP.SERVICES]: renderServicesStep,
  [STEP.DETAILS]: renderDetailsStep,
  [STEP.CONSULTATION]: renderConsultationStep,
  [STEP.CONTACT]: renderContactStep,
  [STEP.REVIEW]: renderReview,
};

export function mount(root, options = {}) {
  const config = options.config || CONFIG;
  const now = options.now || (() => new Date());
  const store = options.store || createStore(createInitialState(config), { now });
  const controller = options.controller || createSubmissionController({ config });
  const wizard = createWizard({ store, ctx: () => ({ config, now: now() }) });
  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  // UI-only state (not part of the inquiry)
  const touched = new Set();
  let attempted = false;
  let lastStep = store.getState().step;

  // ---------------- static shell
  const liveRegion = el('p', { class: 'dvn-sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const progress = el('ol', { class: 'dvn-progress' });
  const errorSummary = el('div', { class: 'dvn-summary', role: 'alert', tabindex: '-1', hidden: true });
  const stepHost = el('div', { class: 'dvn-step-host' });
  const statusArea = el('div', { class: 'dvn-status', role: 'status', 'aria-live': 'polite' });
  const backBtn = el('button', { type: 'button', class: 'dvn-btn dvn-btn--secondary' }, STRINGS.back);
  const nextBtn = el('button', { type: 'submit', class: 'dvn-btn dvn-btn--primary' }, STRINGS.continue);
  const honeypot = el('input', {
    type: 'hidden',
    name: config.provider.honeypotField,
    value: '',
    class: 'dvn-hp',
    tabindex: '-1',
    autocomplete: 'off',
  });
  const form = el(
    'form',
    { class: 'dvn-form', novalidate: true, 'aria-label': STRINGS.formTitle },
    errorSummary,
    stepHost,
    honeypot,
    statusArea,
    el('div', { class: 'dvn-actions' }, backBtn, nextBtn),
  );
  const banner = controller.isConfigured()
    ? null
    : el('div', { class: 'dvn-banner', role: 'note' }, icon('alert', { size: 20 }), el('p', {}, STRINGS.notConfiguredBanner));
  const header = el(
    'header',
    { class: 'dvn-header' },
    el('h1', { class: 'dvn-title' }, STRINGS.formTitle),
    el('p', { class: 'dvn-intro' }, STRINGS.formIntro),
    el('p', { class: 'dvn-legend-note' }, el('span', { class: 'dvn-req', 'aria-hidden': 'true' }, '*'), ' ', 'Required fields'),
  );
  const shell = el('div', { class: 'dvn-shell' }, header, banner, el('nav', { 'aria-label': 'Form progress' }, progress), liveRegion, form);
  clear(root);
  root.classList.add('dvn');
  root.appendChild(shell);

  // ---------------- rendering
  const ctxFor = () => ({
    state: store.getState(),
    store,
    config,
    now,
    wizard,
    rerender,
    onBlur: (key) => {
      touched.add(key);
      refreshErrors();
    },
    edit: (step) => {
      wizard.editFromReview(step);
      afterNavigate();
    },
  });

  function renderProgress() {
    const current = visibleStepFor(store.getState().step);
    clear(progress);
    STRINGS.steps.forEach((label, i) => {
      const n = i + 1;
      const status = n < current ? 'done' : n === current ? 'current' : 'todo';
      progress.appendChild(
        el(
          'li',
          { class: ['dvn-progress__item', `dvn-progress__item--${status}`], 'aria-current': status === 'current' ? 'step' : undefined },
          el('span', { class: 'dvn-progress__dot', 'aria-hidden': 'true' }, status === 'done' ? icon('check', { size: 14 }) : String(n)),
          el('span', { class: 'dvn-progress__label' }, label),
          el('span', { class: 'dvn-sr-only' }, status === 'done' ? ' (completed)' : ''),
        ),
      );
    });
  }

  function renderButtons() {
    const { step, returnToReview } = store.getState();
    backBtn.hidden = step === STEP.SERVICES;
    nextBtn.textContent =
      step === STEP.REVIEW ? STRINGS.submit : returnToReview ? STRINGS.backToReview : STRINGS.continue;
    nextBtn.classList.toggle('dvn-btn--submit', step === STEP.REVIEW);
  }

  function render() {
    const { step } = store.getState();
    clear(stepHost);
    const view = RENDERERS[step](ctxFor());
    if (step !== lastStep) view.classList.add('dvn-step--enter');
    stepHost.appendChild(view);
    renderProgress();
    renderButtons();
    refreshErrors();
  }

  /** Structural re-render that keeps keyboard focus where the user was. */
  function rerender(focusId) {
    // Remember what had focus (radios/checkboxes have stable ids), re-render,
    // then restore it so keyboard and screen-reader users keep their place.
    const active = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : '';
    render();
    const esc = (id) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id);
    const target =
      (focusId && root.querySelector(`#${esc(focusId)}`)) || (active && root.querySelector(`#${esc(active)}`));
    if (target) target.focus({ preventScroll: true });
  }

  // ---------------- error display
  function fieldLabel(key) {
    const container = root.querySelector(`#${domId(key, 'field')}`);
    const label = container && container.querySelector(':scope > legend, :scope > label.dvn-label');
    return label && label.firstChild ? label.firstChild.textContent.trim() : '';
  }

  function currentErrors() {
    const { step } = store.getState();
    return step <= STEP.CONTACT ? validateStep(step, store.getState(), { config, now: now() }) : {};
  }

  function refreshErrors() {
    const errors = currentErrors();
    root.querySelectorAll('[data-field]').forEach((node) => {
      const key = node.getAttribute('data-field');
      const show = errors[key] && (attempted || touched.has(key));
      setFieldError(root, key, show ? errors[key] : null);
    });
    if (!errorSummary.hidden) renderSummary(errors);
  }

  function renderSummary(errors) {
    const keys = Object.keys(errors).filter((k) => root.querySelector(`#${domId(k, 'field')}`));
    clear(errorSummary);
    if (!keys.length) {
      errorSummary.hidden = true;
      return;
    }
    errorSummary.hidden = false;
    errorSummary.appendChild(el('p', { class: 'dvn-summary__title' }, icon('alert', { size: 18 }), STRINGS.errorSummaryTitle));
    errorSummary.appendChild(
      el(
        'ul',
        { class: 'dvn-summary__list' },
        keys.map((k) => {
          const label = fieldLabel(k);
          return el(
            'li',
            {},
            el(
              'button',
              { type: 'button', class: 'dvn-btn dvn-btn--link', on: { click: () => focusField(root, k) } },
              label ? `${label}: ${errors[k]}` : errors[k],
            ),
          );
        }),
      ),
    );
  }

  function showStepErrors(errors) {
    attempted = true;
    const s = store.getState();
    if (s.step === STEP.DETAILS) {
      // Open collapsed groups that contain errors so the user can see them.
      s.services.forEach((id) => {
        if (Object.keys(errors).some((k) => k.startsWith(`svc__${id}__`)) && !s.expandedGroups.includes(id)) {
          store.setGroupExpanded(id, true);
        }
      });
      render();
    }
    errorSummary.hidden = false;
    refreshErrors();
    errorSummary.focus();
  }

  // ---------------- navigation
  function afterNavigate() {
    attempted = false;
    touched.clear();
    errorSummary.hidden = true;
    clear(statusArea);
    render();
    lastStep = store.getState().step;
    const n = visibleStepFor(store.getState().step);
    liveRegion.textContent = `${STRINGS.stepLabel(n, VISIBLE_STEP_COUNT)}: ${STRINGS.steps[n - 1]}`;
    const heading = stepHost.querySelector('.dvn-step__heading');
    if (heading) heading.focus({ preventScroll: true });
    if (inIframe) postToParent({ type: 'devion-inquiry:navigate', step: n });
    else if (typeof root.scrollIntoView === 'function' && root.getBoundingClientRect().top < 0) {
      root.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  backBtn.addEventListener('click', () => {
    wizard.back();
    afterNavigate();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (store.getState().step === STEP.REVIEW) {
      submit();
      return;
    }
    const result = wizard.next();
    if (result.ok || result.redirected) {
      afterNavigate();
      if (result.redirected) showStepErrors(result.errors);
    } else {
      showStepErrors(result.errors);
    }
  });

  // ---------------- submission
  function setBusy(busy) {
    nextBtn.disabled = busy;
    backBtn.disabled = busy;
    form.setAttribute('aria-busy', busy ? 'true' : 'false');
    nextBtn.textContent = busy ? STRINGS.submitting : STRINGS.submit;
  }

  function showStatus(kind, message, { withFallback = true } = {}) {
    clear(statusArea);
    const email = config.contact.fallbackEmail;
    statusArea.appendChild(
      el(
        'div',
        { class: ['dvn-alert', `dvn-alert--${kind}`] },
        icon(kind === 'error' ? 'alert' : 'info', { size: 20 }),
        el(
          'div',
          {},
          el('p', {}, message),
          withFallback && email
            ? el('p', {}, STRINGS.fallbackPrefix, el('a', { href: `mailto:${email}` }, email), '.')
            : null,
        ),
      ),
    );
  }

  function showSuccess(reference) {
    clear(shell);
    const heading = el('h2', { class: 'dvn-success__title', tabindex: '-1' }, STRINGS.successTitle);
    shell.appendChild(
      el(
        'div',
        { class: 'dvn-success', role: 'status' },
        el('span', { class: 'dvn-success__icon' }, icon('check', { size: 32 })),
        heading,
        el('p', {}, STRINGS.successBody),
        reference ? el('p', { class: 'dvn-muted' }, `${STRINGS.successReference}: `, el('code', {}, reference)) : null,
      ),
    );
    heading.focus();
    if (inIframe) postToParent({ type: 'devion-inquiry:navigate', step: 'done' });
  }

  async function submit() {
    if (controller.isInFlight()) return;
    const check = wizard.validateForSubmit();
    if (!check.valid) {
      afterNavigate();
      showStepErrors(check.errors);
      return;
    }
    setBusy(true);
    clear(statusArea);
    const inquiry = buildInquiry(store.getState(), { config, now: now() });
    const result = await controller.submit(inquiry, { honeypotValue: honeypot.value });

    switch (result.status) {
      case SubmissionStatus.SUCCESS: {
        const reference = result.reference || inquiry.submissionId;
        wizard.finish();
        store.resetAfterSuccess(); // drop personal data from memory
        showSuccess(reference);
        return;
      }
      case SubmissionStatus.BUSY:
        return;
      case SubmissionStatus.RATE_LIMITED: {
        setBusy(false);
        showStatus('warning', STRINGS.rateLimitedMessage, { withFallback: false });
        nextBtn.disabled = true;
        setTimeout(() => {
          nextBtn.disabled = false;
        }, result.retryAfterMs || config.provider.rateLimitWaitMs);
        return;
      }
      case SubmissionStatus.UNCERTAIN:
        setBusy(false);
        nextBtn.textContent = STRINGS.retry;
        showStatus('warning', STRINGS.uncertainMessage);
        return;
      case SubmissionStatus.REJECTED:
        setBusy(false);
        showStatus('error', STRINGS.validationRejectedMessage);
        return;
      case SubmissionStatus.NOT_CONFIGURED:
        setBusy(false);
        showStatus('error', STRINGS.notConfiguredMessage);
        return;
      default:
        setBusy(false);
        nextBtn.textContent = STRINGS.retry;
        showStatus('error', STRINGS.failureMessage);
    }
  }

  // ---------------- live error refresh while typing (only for shown fields)
  const unsubscribe = store.subscribe(() => {
    if (attempted || touched.size) refreshErrors();
  });

  // ---------------- iframe auto-height (no personal data is ever posted)
  function postToParent(message) {
    try {
      window.parent.postMessage(message, '*');
    } catch {
      /* cross-origin parent unavailable: ignore */
    }
  }
  let resizeObserver = null;
  if (inIframe && typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => {
      postToParent({ type: 'devion-inquiry:height', height: Math.ceil(document.documentElement.scrollHeight) });
    });
    resizeObserver.observe(document.body || root);
  }

  render();

  return {
    store,
    wizard,
    destroy() {
      unsubscribe();
      if (resizeObserver) resizeObserver.disconnect();
      clear(root);
    },
  };
}

function autoMount() {
  document.querySelectorAll('[data-devion-inquiry]').forEach((node) => {
    if (!node.dataset.dvnMounted) {
      node.dataset.dvnMounted = 'true';
      mount(node);
    }
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount);
  else autoMount();
}
