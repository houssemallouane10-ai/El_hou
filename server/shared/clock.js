export const systemClock = { now: () => new Date() };

export const DAY_MS = 24 * 60 * 60 * 1000;

export const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);
