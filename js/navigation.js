/**
 * Wizard navigation rules (DOM-free, unit-tested).
 *
 * Internal steps: 1 Services · 2 Project details · 3 Consultation ·
 * 4 Contact · 5 Review (shown as part of step 4 "Contact & review") · 6 Done.
 */
import { validateStep, validateAll } from './validation.js';

export const STEP = Object.freeze({
  SERVICES: 1,
  DETAILS: 2,
  CONSULTATION: 3,
  CONTACT: 4,
  REVIEW: 5,
  DONE: 6,
});

export const VISIBLE_STEP_COUNT = 4;

/** Progress indicator position (1–4) for an internal step. */
export function visibleStepFor(step) {
  return Math.min(step, VISIBLE_STEP_COUNT);
}

export function createWizard({ store, ctx = {} }) {
  const vctx = () => (typeof ctx === 'function' ? ctx() : ctx);
  const enter = (step) => {
    const s = store.getState();
    if (step === STEP.DETAILS && s.expandedGroups.length === 0 && s.services.length) {
      // Progressive disclosure: many services → open only the first group.
      const open = s.services.length <= 2 ? s.services : [s.services[0]];
      open.forEach((id) => store.setGroupExpanded(id, true));
    }
    store.setStep(step);
  };

  return {
    current: () => store.getState().step,

    /** Validate the current step; advance only when it is valid. */
    next() {
      const s = store.getState();
      const step = s.step;
      if (step >= STEP.REVIEW) return { ok: false, errors: {} };
      const errors = validateStep(step, s, vctx());
      if (Object.keys(errors).length) return { ok: false, errors };
      if (s.returnToReview) {
        // Re-check everything before going back to review.
        const all = validateAll(s, vctx());
        if (!all.valid && all.step !== step) {
          store.setReturnToReview(false);
          enter(all.step);
          return { ok: false, errors: all.errors, redirected: true };
        }
        store.setReturnToReview(false);
        enter(STEP.REVIEW);
        return { ok: true, errors: {} };
      }
      enter(step + 1);
      return { ok: true, errors: {} };
    },

    back() {
      const step = store.getState().step;
      store.setReturnToReview(false);
      if (step > STEP.SERVICES && step <= STEP.REVIEW) enter(step - 1);
    },

    /** "Edit" from the review screen: jump to a section, then return. */
    editFromReview(step) {
      if (step < STEP.SERVICES || step > STEP.CONTACT) return;
      store.setReturnToReview(true);
      enter(step);
    },

    /** Final gate before submission; jumps to the first invalid step. */
    validateForSubmit() {
      const result = validateAll(store.getState(), vctx());
      if (!result.valid) {
        store.setReturnToReview(false);
        enter(result.step);
      }
      return result;
    },

    finish() {
      store.setStep(STEP.DONE);
    },
  };
}
