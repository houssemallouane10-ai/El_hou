// Field limits enforced by the server and mirrored by the browser forms (maxlength, counters).

export const LIMITS = {
  name: { min: 2, max: 60 },
  password: { min: 8, max: 128 },
  companyName: { max: 80 },
  headline: { max: 80 },
  bio: { max: 1000 },
  skills: { maxItems: 10, maxLength: 30 },
  expectedPay: { max: 40 },
  experienceYears: { min: 0, max: 50 },
  jobTitle: { min: 6, max: 90 },
  jobDescription: { min: 20, max: 3000 },
  jobRequirements: { max: 1500 },
  address: { max: 120 },
  positions: { min: 1, max: 100 },
  salary: { min: 0, max: 10_000_000 },
  applicationMessage: { max: 1000 },
  messageBody: { max: 2000 },
  reportDetails: { max: 500 },
  alertCategories: { maxItems: 15 },
  searchQuery: { max: 80 },
};

export const PAGE_SIZE = { default: 20, max: 50 };
