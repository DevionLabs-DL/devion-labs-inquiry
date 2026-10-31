/**
 * Submission adapter contract.
 *
 * The UI only knows this interface. Swapping Forminit for the future Devion
 * API means writing one new adapter and changing CONFIG.provider.type.
 */

/** Every adapter resolves (never rejects) with one of these statuses. */
export const SubmissionStatus = Object.freeze({
  /** Provider confirmed it stored the inquiry. The only status that shows success. */
  SUCCESS: 'success',
  /** Provider asked us to slow down; nothing was stored. */
  RATE_LIMITED: 'rate_limited',
  /** Provider rejected the data (validation); nothing was stored. */
  REJECTED: 'rejected',
  /** Provider refused for configuration/plan reasons, or a server error occurred. */
  UNAVAILABLE: 'unavailable',
  /** Request never reached the provider (offline, DNS, blocked). */
  NETWORK_ERROR: 'network_error',
  /** Timed out or ambiguous response: the inquiry may or may not be stored. */
  UNCERTAIN: 'uncertain',
  /** No endpoint configured: the form must not pretend to work. */
  NOT_CONFIGURED: 'not_configured',
  /** A submission is already in flight (double-click protection). */
  BUSY: 'busy',
});

export class InquirySubmissionAdapter {
  /**
   * @param {object} inquiry normalized payload from payload.js#buildInquiry
   * @returns {Promise<{status: string, reference?: string, code?: string, retryAfterMs?: number}>}
   */
  // eslint-disable-next-line no-unused-vars
  async submit(inquiry) {
    throw new Error('Not implemented');
  }
}

/** fetch with a hard timeout. Rejects with an AbortError on timeout. */
export async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function readJsonSafely(response) {
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export function isAbortError(err) {
  return Boolean(err) && (err.name === 'AbortError' || err.name === 'TimeoutError');
}
