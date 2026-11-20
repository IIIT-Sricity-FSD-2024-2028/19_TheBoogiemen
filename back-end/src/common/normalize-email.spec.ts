import { normalizeEmail } from './normalize-email';

describe('normalizeEmail', () => {
  it('lowercases the whole address', () => {
    expect(normalizeEmail('Student@Example.com')).toBe('student@example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeEmail('  student@example.com  ')).toBe('student@example.com');
  });

  it('treats differently-cased emails as equal once normalized', () => {
    expect(normalizeEmail('John.Doe@College.EDU')).toBe(normalizeEmail('john.doe@college.edu'));
  });

  it('returns an empty string for null/undefined rather than throwing', () => {
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
  });
});
