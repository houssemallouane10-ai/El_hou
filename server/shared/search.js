// Accent- and spelling-tolerant search text. Arabic variants are folded so that
// "أ/إ/آ/ا", "ة/ه", "ى/ي" and words with or without harakat all match each other.

const COMBINING_MARKS = /[\u0300-\u036F\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;
const NON_WORD = /[^\p{L}\p{N}]+/gu;
const MAX_TERMS = 6;

const normalizeForSearch = (text) => String(text ?? '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(COMBINING_MARKS, '')
  .replace(TATWEEL, '')
  .replace(/\u0671/g, '\u0627')
  .replace(/\u0629/g, '\u0647')
  .replace(/\u0649/g, '\u064A')
  .replace(NON_WORD, ' ')
  .trim();

export const buildSearchText = (...parts) => normalizeForSearch(parts.filter(Boolean).join(' '));

export const searchTerms = (query) => [...new Set(normalizeForSearch(query).split(' ').filter((term) => term.length >= 2))]
  .slice(0, MAX_TERMS);

const escapeLike = (term) => term.replace(/[\\%_]/g, (char) => `\\${char}`);

// Builds parameterized WHERE fragments. Every value goes through a named parameter.
export const createFilter = () => {
  const clauses = [];
  const params = {};
  let counter = 0;

  const filter = {
    params,
    add(clause, clauseParams = {}) {
      clauses.push(clause);
      Object.assign(params, clauseParams);
      return filter;
    },
    addSearch(column, terms) {
      for (const term of terms) {
        const name = `term${counter++}`;
        clauses.push(`${column} LIKE @${name} ESCAPE '\\'`);
        params[name] = `%${escapeLike(term)}%`;
      }
      return filter;
    },
    where() {
      return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    },
  };

  return filter;
};
