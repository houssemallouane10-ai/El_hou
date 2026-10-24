import { communeById, wilayaByCode } from '../../shared/geo.js';
import { invalid } from './errors.js';

// Resolves an untrusted wilaya/commune pair. The commune decides the wilaya; a wilaya sent
// alongside must agree with it.
export const resolvePlace = ({ wilayaCode = null, communeId = null }, { requireCommune = false } = {}) => {
  const commune = communeId === null ? null : communeById(communeId);
  if (communeId !== null && !commune) throw invalid({ communeId: 'invalid' });
  if (requireCommune && !commune) throw invalid({ communeId: 'required' });
  const wilaya = wilayaCode === null ? null : wilayaByCode(wilayaCode);
  if (wilayaCode !== null && !wilaya) throw invalid({ wilayaCode: 'invalid' });
  if (commune && wilaya && commune.wilaya !== wilaya.code) throw invalid({ communeId: 'wrong_wilaya' });
  const code = commune?.wilaya ?? wilaya?.code ?? null;
  if (code === null) throw invalid({ wilayaCode: 'required' });
  return { wilayaCode: code, communeId: commune?.id ?? null };
};

// Query-string filters: unknown values are ignored rather than rejected.
export const readWilayaFilter = (value) => wilayaByCode(value)?.code ?? null;
export const readCommuneFilter = (value) => communeById(value)?.id ?? null;

// Both languages, so a search for "تبسة" or "Tébessa" finds the place.
export const placeSearchText = ({ wilayaCode, communeId }) => {
  const commune = communeById(communeId);
  const wilaya = wilayaByCode(wilayaCode);
  return [commune?.ar, commune?.fr, wilaya?.ar, wilaya?.fr].filter(Boolean).join(' ');
};

// "نقرين، بئر العاتر" — the commune, then its wilaya when the names differ.
export const placeLabelArabic = ({ wilayaCode, communeId }) => {
  const commune = communeById(communeId);
  const wilaya = wilayaByCode(wilayaCode);
  if (!commune) return wilaya?.ar ?? '';
  return commune.ar === wilaya?.ar || !wilaya ? commune.ar : `${commune.ar}، ${wilaya.ar}`;
};
