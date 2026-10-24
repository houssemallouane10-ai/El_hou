// Algerian phone numbers. Stored in national format: mobile 0[5-7]XXXXXXXX, landline 0XXXXXXXX.

const MOBILE_PATTERN = /^0[567]\d{8}$/;
const LANDLINE_PATTERN = /^0[2-4]\d{7}$/;
const EASTERN_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

const toWesternDigit = (char) => {
  const code = char.charCodeAt(0);
  return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
};

export const normalizePhone = (input) => {
  let value = String(input ?? '').replace(EASTERN_DIGITS, toWesternDigit).replace(/[^\d+]/g, '');
  if (value.startsWith('+213')) value = `0${value.slice(4)}`;
  else if (value.startsWith('00213')) value = `0${value.slice(5)}`;
  else if (value.startsWith('213') && value.length >= 11) value = `0${value.slice(3)}`;
  return value.replace(/\+/g, '');
};

export const isMobilePhone = (phone) => MOBILE_PATTERN.test(phone);

export const isPhone = (phone) => MOBILE_PATTERN.test(phone) || LANDLINE_PATTERN.test(phone);

export const whatsappLink = (phone, text = '') => {
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/213${phone.slice(1)}${query}`;
};

export const formatPhone = (phone) => {
  if (MOBILE_PATTERN.test(phone)) return phone.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4');
  if (LANDLINE_PATTERN.test(phone)) return phone.replace(/^(\d{3})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4');
  return phone;
};
