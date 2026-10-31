/**
 * All user-facing copy (English). For Hungarian localization, add a sibling
 * object with the same keys and select it by CONFIG.locale.
 * Service and question labels live in services.js.
 */
export const STRINGS = Object.freeze({
  formTitle: 'Start your project with Devion Labs',
  formIntro:
    'Tell us what you need in four short steps. It takes about 5 minutes, and our team will contact you to arrange a consultation.',
  stepLabel: (n, total) => `Step ${n} of ${total}`,
  steps: Object.freeze([
    'Services',
    'Project details',
    'Consultation',
    'Contact & review',
  ]),
  required: 'Required',
  optional: 'Optional',
  back: 'Back',
  continue: 'Continue',
  backToReview: 'Save and return to review',
  submit: 'Submit Inquiry & Request Consultation',
  submitting: 'Submitting…',
  retry: 'Try again',
  edit: 'Edit',
  expand: 'Show questions',
  collapse: 'Hide questions',
  selectPlaceholder: 'Select an option',
  answeredCount: (done, total) => `${done} of ${total} answered`,

  step1Heading: 'Which services do you need?',
  step1Help: 'Select all that apply. You can choose more than one.',
  primaryHeading: 'Which one is your main priority?',
  primaryNone: 'No primary service',

  step2Heading: 'Tell us about your project',
  step2Help: 'Questions are grouped by the services you selected.',
  commonHeading: 'About your project',

  step3Heading: 'When would you like to talk?',
  step3Help:
    'Your preferred date and time are not confirmed appointments. Our team will contact you to arrange a suitable consultation.',
  timeSlotsHelp: 'Times are in the time zone you select below.',
  weekendNote: 'Weekend requests are subject to availability.',
  timeZoneLabel: 'Time zone',
  flexibleLabel: "I'm flexible if my preferred date or time isn't available.",

  step4Heading: 'Your contact details',
  reviewHeading: 'Review your inquiry',
  reviewHelp: 'Please check your answers before submitting. Use “Edit” to change any section.',
  privacyLabelBefore: 'I have read the ',
  privacyLinkText: 'privacy notice',
  privacyLabelAfter: ' and understand how my inquiry will be processed.',
  privacyNotConfigured: ' (link not yet available)',

  reviewSections: Object.freeze({
    services: 'Selected services',
    project: 'Project information',
    answers: 'Questionnaire answers',
    consultation: 'Consultation preferences',
    contact: 'Contact details',
  }),
  notProvided: 'Not provided',

  errorSummaryTitle: 'Please fix the following before continuing:',

  successTitle: 'Thank you for contacting Devion Labs!',
  successBody:
    "We've received your project inquiry and will review the details. Our team will contact you to discuss your project and arrange a suitable consultation time.",
  successReference: 'Reference',

  failureMessage: 'Something went wrong while submitting your inquiry. Please try again.',
  fallbackPrefix: 'If the problem continues, email us at ',
  uncertainMessage:
    "We couldn't confirm whether your inquiry reached us — the connection timed out. It may have been received. Please wait a moment and try again; if you are unsure, email us before resubmitting so we can check.",
  rateLimitedMessage: 'Please wait a few seconds before trying again.',
  validationRejectedMessage:
    'Our submission service rejected some of the information. Please check your contact details (for example, the phone number format) and try again.',
  notConfiguredMessage:
    'This form is not connected to a submission service yet, so it cannot send your inquiry. Please email us instead.',
  notConfiguredBanner:
    'Setup required: no submission endpoint is configured. Submissions are disabled until the Forminit form ID is added to js/config.js.',
});

/** Fixed option lists with stable ids (labels localizable). */
export const OPTIONS = Object.freeze({
  datePreference: Object.freeze([
    Object.freeze({ id: 'specific', label: 'I have a preferred date' }),
    Object.freeze({ id: 'earliest', label: 'Earliest suitable appointment' }),
    Object.freeze({ id: 'none', label: 'No specific date preference' }),
  ]),
  days: Object.freeze([
    Object.freeze({ id: 'weekdays', label: 'Weekdays (Monday–Friday)' }),
    Object.freeze({ id: 'weekends', label: 'Weekends (Saturday–Sunday)' }),
    Object.freeze({ id: 'both', label: 'Both' }),
  ]),
  format: Object.freeze([
    Object.freeze({ id: 'video', label: 'Video call' }),
    Object.freeze({ id: 'phone', label: 'Phone call' }),
    Object.freeze({ id: 'no-preference', label: 'No preference' }),
  ]),
  contactMethod: Object.freeze([
    Object.freeze({ id: 'email', label: 'Email' }),
    Object.freeze({ id: 'phone', label: 'Phone' }),
    Object.freeze({ id: 'no-preference', label: 'No preference' }),
  ]),
});

export function labelFor(list, id) {
  const found = list.find((o) => o.id === id);
  return found ? found.label : '';
}
