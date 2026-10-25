// What is still missing before (or right after) going live, printed when the server starts.
export const startupWarnings = ({ config, services }) => {
  const warnings = [];
  if (services.accounts.needsSetup()) {
    warnings.push('New platform: open the site now and create the first account; it becomes the owner with the admin console.');
  } else if (!services.accounts.hasOwner()) {
    warnings.push('No owner: run "npm run make-owner -- <phone>" to name one.');
  }
  const support = services.platform.settings();
  if (config.isProduction && !support.supportEmail && !support.supportWhatsapp) {
    warnings.push('No support contact yet: add a WhatsApp number or an email in the admin console (Settings); Google Play expects one in the privacy policy.');
  }
  if (config.isProduction && !config.publicUrl) {
    warnings.push('PUBLIC_URL is not set: share links and the sitemap use the host of each request.');
  }
  return warnings;
};
