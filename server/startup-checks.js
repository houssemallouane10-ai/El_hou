// Settings worth fixing before (or right after) going live, printed when the server starts.
export const startupWarnings = ({ config, services }) => {
  const warnings = [];
  if (config.legacyAdminPhones) {
    warnings.push('ADMIN_PHONES is no longer used: set OWNER_CODE and enter it when you sign up (or in Settings) to become the owner.');
  }
  if (!services.accounts.hasOwner()) {
    warnings.push(config.ownerCode
      ? 'No owner yet: sign up in the app, tap "I own this platform" and enter OWNER_CODE to unlock the admin console.'
      : 'No owner yet and OWNER_CODE is not set: set OWNER_CODE (8 characters or more), then sign up with it to unlock the admin console.');
  }
  if (config.isProduction && !config.supportEmail && !config.supportWhatsapp) {
    warnings.push('Set SUPPORT_EMAIL or SUPPORT_WHATSAPP: Google Play expects a contact in the privacy policy.');
  }
  if (config.isProduction && !config.publicUrl) {
    warnings.push('PUBLIC_URL is not set: share links and the sitemap use the host of each request.');
  }
  return warnings;
};
