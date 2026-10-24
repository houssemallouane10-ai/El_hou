// How complete a profile is, from the fields employers look at first.
const CHECKS = [
  { field: 'name', done: (user) => Boolean(user.name) },
  { field: 'headline', done: (user) => Boolean(user.headline) },
  { field: 'category', done: (user) => Boolean(user.category) },
  { field: 'bio', done: (user) => Boolean(user.bio) },
  { field: 'skills', done: (user) => (user.skills?.length ?? 0) > 0 },
  { field: 'experienceYears', done: (user) => user.experienceYears !== null && user.experienceYears !== undefined },
  { field: 'whatsapp', done: (user) => Boolean(user.whatsapp) },
];

const EMPLOYER_CHECKS = [
  { field: 'name', done: (user) => Boolean(user.name) },
  { field: 'companyName', done: (user) => Boolean(user.companyName) },
  { field: 'bio', done: (user) => Boolean(user.bio) },
  { field: 'whatsapp', done: (user) => Boolean(user.whatsapp) },
];

export const profileCompletion = (user) => {
  const checks = user.role === 'employer' ? EMPLOYER_CHECKS : CHECKS;
  const missing = checks.filter((check) => !check.done(user)).map((check) => check.field);
  return { percent: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
};
