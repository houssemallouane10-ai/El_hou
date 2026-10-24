import { addDays } from '../../shared/clock.js';
import { conflict, forbidden, invalid } from '../../shared/errors.js';

// A job offer's visible state is derived, never stored: moderation wins, then the owner's
// open/closed switch, then the expiry date.
export const JOB_STATE = Object.freeze({
  ACTIVE: 'active',
  CLOSED: 'closed',
  EXPIRED: 'expired',
  HIDDEN: 'hidden',
});

export const jobState = (job, nowIso) => {
  if (job.is_hidden) return JOB_STATE.HIDDEN;
  if (job.status === 'closed') return JOB_STATE.CLOSED;
  if (job.expires_at <= nowIso) return JOB_STATE.EXPIRED;
  return JOB_STATE.ACTIVE;
};

// Salary is either "to be agreed" (no amounts) or at least one bound with max >= min.
export const resolveSalary = ({ salaryPeriod, salaryMin, salaryMax }) => {
  if (salaryPeriod === 'negotiable') return { salaryMin: null, salaryMax: null };
  if (salaryMin == null && salaryMax == null) throw invalid({ salaryMin: 'required' });
  if (salaryMin != null && salaryMax != null && salaryMax < salaryMin) throw invalid({ salaryMax: 'less_than_min' });
  return { salaryMin: salaryMin ?? null, salaryMax: salaryMax ?? null };
};

export const JOB_ACTIONS = new Set(['close', 'reopen', 'renew']);

// Returns the column changes for an owner action, or throws when the transition is not allowed.
export const planStatusChange = (job, action, { now, durationDays }) => {
  const nowIso = now.toISOString();
  const state = jobState(job, nowIso);
  if (state === JOB_STATE.HIDDEN) throw forbidden('JOB_HIDDEN');
  if (action === 'close') {
    if (state === JOB_STATE.CLOSED) throw conflict('JOB_ALREADY_CLOSED');
    return { status: 'closed' };
  }
  if (action === 'reopen') {
    if (state !== JOB_STATE.CLOSED) throw conflict('JOB_NOT_CLOSED');
    if (job.expires_at <= nowIso) throw conflict('JOB_EXPIRED');
    return { status: 'active' };
  }
  if (state === JOB_STATE.ACTIVE) throw conflict('JOB_STILL_ACTIVE');
  return { status: 'active', publishedAt: nowIso, expiresAt: addDays(now, durationDays).toISOString() };
};
