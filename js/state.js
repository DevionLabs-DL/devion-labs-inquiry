/**
 * Form state store.
 *
 * Privacy: state lives in memory only. Nothing is written to localStorage,
 * sessionStorage, cookies or the URL (Handbook §10.6 data minimization).
 * A page reload starts a fresh form.
 */
import { SERVICES } from './services.js';
import { CONFIG } from './config.js';

export function generateSubmissionId(cryptoImpl = globalThis.crypto) {
  if (cryptoImpl && typeof cryptoImpl.randomUUID === 'function') {
    return cryptoImpl.randomUUID();
  }
  if (cryptoImpl && typeof cryptoImpl.getRandomValues === 'function') {
    const b = cryptoImpl.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  throw new Error('No secure random source available for submission IDs');
}

export function createInitialState(config = CONFIG) {
  return {
    step: 1,
    services: [],
    primaryService: '',
    answers: {},
    common: {
      description: '',
      objective: '',
      status: '',
      timeline: '',
      budget: '',
      existing_url: '',
      additional: '',
    },
    consultation: {
      datePreference: 'none',
      date: '',
      timeSlots: [],
      days: '',
      timeZone: config.consultation.defaultTimeZone,
      format: '',
      flexible: false,
    },
    contact: {
      fullName: '',
      email: '',
      company: '',
      phone: '',
      website: '',
      contactMethod: '',
      comments: '',
      privacyAck: false,
    },
    consentAcceptedAt: '',
    submissionId: generateSubmissionId(),
    expandedGroups: [],
    returnToReview: false,
  };
}

const SERVICE_ORDER = SERVICES.map((s) => s.id);
const sortServices = (ids) =>
  ids.slice().sort((a, b) => SERVICE_ORDER.indexOf(a) - SERVICE_ORDER.indexOf(b));

/**
 * Minimal observable store. Mutations go through named actions so the
 * rules (ordering, primary reset, consent timestamp) live in one place.
 */
export function createStore(initial = createInitialState(), { now = () => new Date() } = {}) {
  let state = initial;
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn(state));

  const set = (patch) => {
    state = { ...state, ...patch };
    emit();
  };

  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    setStep(step) {
      set({ step });
    },
    setReturnToReview(flag) {
      set({ returnToReview: Boolean(flag) });
    },

    toggleService(serviceId, selected) {
      if (!SERVICE_ORDER.includes(serviceId)) return;
      const has = state.services.includes(serviceId);
      if (selected === has) return;
      const services = selected
        ? sortServices([...state.services, serviceId])
        : state.services.filter((id) => id !== serviceId);
      // Answers for deselected services are kept in memory so re-selecting
      // restores them, but they are excluded from validation and the payload.
      let { primaryService } = state;
      if (services.length < 2) primaryService = '';
      else if (primaryService && primaryService !== 'none' && !services.includes(primaryService)) {
        primaryService = '';
      }
      const expandedGroups = state.expandedGroups.filter((id) => services.includes(id));
      set({ services, primaryService, expandedGroups });
    },

    setPrimaryService(value) {
      set({ primaryService: value });
    },

    setAnswer(serviceId, questionId, value) {
      const prev = state.answers[serviceId] || {};
      set({ answers: { ...state.answers, [serviceId]: { ...prev, [questionId]: value } } });
    },

    setCommon(key, value) {
      set({ common: { ...state.common, [key]: value } });
    },

    setConsultation(key, value) {
      set({ consultation: { ...state.consultation, [key]: value } });
    },

    setContact(key, value) {
      const patch = { contact: { ...state.contact, [key]: value } };
      if (key === 'privacyAck') {
        patch.consentAcceptedAt = value ? now().toISOString() : '';
      }
      set(patch);
    },

    setGroupExpanded(serviceId, expanded) {
      const others = state.expandedGroups.filter((id) => id !== serviceId);
      set({ expandedGroups: expanded ? [...others, serviceId] : others });
    },

    /** After a confirmed submission: new ID so a fresh inquiry is never a duplicate. */
    resetAfterSuccess() {
      state = createInitialState();
      emit();
    },
  };
}
