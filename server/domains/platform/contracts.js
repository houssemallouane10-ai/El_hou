import { invalid } from '../../shared/errors.js';
import { ANDROID_PACKAGE, EMAIL, SHA256_FINGERPRINT, normalizeFingerprint } from '../../shared/formats.js';
import { createValidator } from '../../shared/validation.js';

const MAX_FINGERPRINTS = 5;

// Partial update of the platform settings; an empty field clears it.
export const parseSettings = (input) => {
  const data = createValidator(input, { partial: true })
    .phone('supportWhatsapp', { mobileOnly: true })
    .text('supportEmail', { max: 120 })
    .text('androidPackage', { max: 150 })
    .list('androidFingerprints', { maxItems: MAX_FINGERPRINTS, maxLength: 140 })
    .result();
  const errors = {};
  if (data.supportEmail && !EMAIL.test(data.supportEmail)) errors.supportEmail = 'invalid_email';
  if (data.androidPackage && !ANDROID_PACKAGE.test(data.androidPackage)) errors.androidPackage = 'invalid';
  if (data.androidFingerprints) {
    data.androidFingerprints = [...new Set(data.androidFingerprints.map(normalizeFingerprint))];
    if (data.androidFingerprints.some((item) => !SHA256_FINGERPRINT.test(item))) errors.androidFingerprints = 'invalid_fingerprint';
  }
  if (Object.keys(errors).length > 0) throw invalid(errors);
  return data;
};
