/**
 * Questionnaire engine: conditional visibility and answer helpers.
 * Pure functions — no DOM access — so they are unit-testable.
 */

export function isEmptyValue(value) {
  if (Array.isArray(value)) return value.length === 0;
  return value === undefined || value === null || String(value).trim() === '';
}

/**
 * A question is visible when it has no `showIf`, or when the referenced
 * question's answer matches (`equals` for single values, `includes` for
 * single or multi values).
 */
export function isQuestionVisible(question, answers = {}) {
  const rule = question.showIf;
  if (!rule) return true;
  const ref = answers[rule.question];
  if (rule.equals !== undefined) return ref === rule.equals;
  if (rule.includes !== undefined) {
    return Array.isArray(ref) ? ref.includes(rule.includes) : ref === rule.includes;
  }
  return true;
}

export function getVisibleQuestions(service, answers = {}) {
  return service.questions.filter((q) => isQuestionVisible(q, answers));
}

/** Count required visible questions answered, for the collapsed-group badge. */
export function progressFor(service, answers = {}) {
  const visible = getVisibleQuestions(service, answers).filter((q) => q.required);
  const done = visible.filter((q) => !isEmptyValue(answers[q.id])).length;
  return { done, total: visible.length };
}

/** Toggle a value in a multi-select answer, returning a new array. */
export function toggleInArray(current, value, checked) {
  const list = Array.isArray(current) ? current.slice() : [];
  const idx = list.indexOf(value);
  if (checked && idx === -1) list.push(value);
  if (!checked && idx !== -1) list.splice(idx, 1);
  return list;
}

/** Field key used for errors, element ids and focus management. */
export const fieldKey = {
  service: (serviceId, questionId) => `svc__${serviceId}__${questionId}`,
  common: (id) => `common__${id}`,
  consultation: (id) => `consultation__${id}`,
  contact: (id) => `contact__${id}`,
};
