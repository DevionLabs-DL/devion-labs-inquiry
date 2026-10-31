/**
 * Future Devion backend adapter (NOT active in Phase 1).
 *
 * Posts the normalized inquiry as JSON with an Idempotency-Key equal to the
 * submissionId, so a retried request after a timeout cannot create a duplicate
 * (API Design Constitution: idempotency on unsafe retried operations).
 *
 * Expected backend contract (see docs/BACKEND-MIGRATION.md):
 *   POST {endpoint}  Content-Type: application/json  Idempotency-Key: <uuid>
 *   201/200 -> { "id": "<server id>" }
 *   400/422 -> problem-details (field errors)
 *   429     -> Retry-After header (seconds)
 */
import {
  InquirySubmissionAdapter,
  SubmissionStatus,
  fetchWithTimeout,
  readJsonSafely,
  isAbortError,
} from './adapter.js';

export class CustomApiAdapter extends InquirySubmissionAdapter {
  constructor({ endpoint, timeoutMs = 15000, fetchImpl = (...args) => globalThis.fetch(...args) }) {
    super();
    this.endpoint = endpoint;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async submit(inquiry) {
    if (!this.endpoint) return { status: SubmissionStatus.NOT_CONFIGURED };
    let response;
    try {
      response = await fetchWithTimeout(
        this.fetchImpl,
        this.endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Idempotency-Key': inquiry.submissionId,
          },
          body: JSON.stringify(inquiry),
          credentials: 'omit',
        },
        this.timeoutMs,
      );
    } catch (err) {
      if (isAbortError(err)) return { status: SubmissionStatus.UNCERTAIN, code: 'TIMEOUT' };
      return { status: SubmissionStatus.NETWORK_ERROR, code: 'NETWORK' };
    }
    const json = await readJsonSafely(response);
    if (response.ok) {
      return { status: SubmissionStatus.SUCCESS, reference: json && json.id ? String(json.id) : undefined };
    }
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      return {
        status: SubmissionStatus.RATE_LIMITED,
        code: 'HTTP_429',
        retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000,
      };
    }
    if (response.status === 400 || response.status === 422) {
      return { status: SubmissionStatus.REJECTED, code: `HTTP_${response.status}` };
    }
    return { status: SubmissionStatus.UNAVAILABLE, code: `HTTP_${response.status}` };
  }
}
