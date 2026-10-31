/**
 * Submission controller: picks the adapter from CONFIG, enforces the
 * single-flight lock (double-click protection) and never reports success
 * unless the adapter confirmed the provider accepted the inquiry.
 */
import { CONFIG, isProviderConfigured } from './config.js';
import { SubmissionStatus } from './adapters/adapter.js';
import { ForminitAdapter } from './adapters/forminit-adapter.js';
import { CustomApiAdapter } from './adapters/custom-api-adapter.js';

export function createAdapter(config = CONFIG, { fetchImpl } = {}) {
  const shared = fetchImpl ? { fetchImpl } : {};
  if (config.provider.type === 'custom-api') {
    return new CustomApiAdapter({
      endpoint: config.customApi.endpoint,
      timeoutMs: config.provider.timeoutMs,
      ...shared,
    });
  }
  return new ForminitAdapter({
    formId: config.provider.formId,
    endpointBase: config.provider.endpointBase,
    timeoutMs: config.provider.timeoutMs,
    rateLimitWaitMs: config.provider.rateLimitWaitMs,
    honeypotField: config.provider.honeypotField,
    ...shared,
  });
}

export function createSubmissionController({ config = CONFIG, adapter = createAdapter(config) } = {}) {
  let inFlight = false;
  const configured = isProviderConfigured(config);

  return {
    isConfigured: () => configured,
    isInFlight: () => inFlight,

    async submit(inquiry, options = {}) {
      if (!configured) return { status: SubmissionStatus.NOT_CONFIGURED };
      if (inFlight) return { status: SubmissionStatus.BUSY };
      inFlight = true;
      try {
        const result = await adapter.submit(inquiry, options);
        if (!result || typeof result.status !== 'string') {
          return { status: SubmissionStatus.UNCERTAIN, code: 'ADAPTER_CONTRACT' };
        }
        return result;
      } catch {
        // Adapters should never throw; if one does, the outcome is unknown.
        return { status: SubmissionStatus.UNCERTAIN, code: 'ADAPTER_EXCEPTION' };
      } finally {
        inFlight = false;
      }
    },
  };
}
