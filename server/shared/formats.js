// Formats shared by the server configuration and the settings owners save in the admin console.
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ANDROID_PACKAGE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
export const SHA256_FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

// Accepts a certificate fingerprint the way Play Console shows it (AB:CD:…), in lowercase, with
// spaces, or as 64 bare hex digits. Anything else is returned as typed, to fail validation.
export const normalizeFingerprint = (value) => {
  const text = String(value ?? '').trim();
  const hex = text.toUpperCase().replace(/[\s:]/g, '');
  return /^[0-9A-F]{64}$/.test(hex) ? hex.match(/.{2}/g).join(':') : text.toUpperCase();
};
