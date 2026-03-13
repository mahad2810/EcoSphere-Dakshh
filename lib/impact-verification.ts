export type ImpactSubmissionType = 'environmental_issue' | 'attendance' | 'daily_report';

interface TriggerImpactVerificationInput {
  submissionType: ImpactSubmissionType;
  submissionId: string;
  radiusMeters?: number;
  projectAreaName?: string;
  projectCenterLatitude?: number;
  projectCenterLongitude?: number;
}

// Fire-and-forget helper used by submission routes.
export function triggerImpactVerification(input: TriggerImpactVerificationInput): void {
  const evaluatorUrl = process.env.AI_EVALUATOR_URL ?? 'http://localhost:8000';

  fetch(`${evaluatorUrl}/verify-impact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
    .then(async (res) => {
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn('[ImpactVerification] evaluator returned non-OK response', payload);
        return;
      }
      console.log('[ImpactVerification] evaluator accepted request', payload);
    })
    .catch((err) => {
      // Non-fatal by design: submission is stored and can be retried later.
      console.warn('[ImpactVerification] evaluator unreachable:', err?.message || err);
    });
}
