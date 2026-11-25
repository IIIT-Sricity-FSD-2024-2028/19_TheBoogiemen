import { mapRowToCanonicalFields, normalizeHeader } from './bulk-onboard.util';

describe('normalizeHeader', () => {
  it('lowercases, trims, and collapses non-alphanumerics to underscores', () => {
    expect(normalizeHeader('Email Address')).toBe('email_address');
    expect(normalizeHeader('  First Name  ')).toBe('first_name');
    expect(normalizeHeader('E-Mail')).toBe('e_mail');
    expect(normalizeHeader('Phone#')).toBe('phone');
  });
});

describe('mapRowToCanonicalFields', () => {
  it('maps common Google-Form-style headers to canonical columns', () => {
    const unrecognized = new Set<string>();
    const fields = mapRowToCanonicalFields(
      {
        'First Name': 'Priya',
        'Last Name': 'Sharma',
        'Email Address': 'priya@example.com',
        'Mobile Number': '9876543210',
        Branch: 'CS',
      },
      unrecognized,
    );
    expect(fields).toEqual({
      first_name: 'Priya',
      last_name: 'Sharma',
      email: 'priya@example.com',
      phone: '9876543210',
      branch: 'CS',
    });
    expect(unrecognized.size).toBe(0);
  });

  it('reports a "Section" column as unrecognized — section is no longer a bulk-onboard field', () => {
    const unrecognized = new Set<string>();
    const fields = mapRowToCanonicalFields(
      { 'First Name': 'Priya', Email: 'priya@example.com', Section: 'B' },
      unrecognized,
    );
    expect(fields).toEqual({ first_name: 'Priya', email: 'priya@example.com' });
    expect(unrecognized.has('Section')).toBe(true);
  });

  it('splits a bare "Name" column into first/last when no first_name column exists', () => {
    const fields = mapRowToCanonicalFields({ Name: 'Arjun Mehta', Email: 'a@example.com' }, new Set());
    expect(fields.first_name).toBe('Arjun');
    expect(fields.last_name).toBe('Mehta');
  });

  it('a single-word Name has no last name', () => {
    const fields = mapRowToCanonicalFields({ Name: 'Cher', Email: 'c@example.com' }, new Set());
    expect(fields.first_name).toBe('Cher');
    expect(fields.last_name).toBeUndefined();
  });

  it('a real first_name column always wins over a Name column, regardless of order', () => {
    const fields = mapRowToCanonicalFields(
      { Name: 'Ignored Full Name', 'First Name': 'Real', 'Last Name': 'Name' },
      new Set(),
    );
    expect(fields.first_name).toBe('Real');
    expect(fields.last_name).toBe('Name');
  });

  it('reports headers it cannot map, and drops empty values', () => {
    const unrecognized = new Set<string>();
    const fields = mapRowToCanonicalFields(
      { Email: 'x@example.com', 'Favourite Colour': 'Blue', Phone: '' },
      unrecognized,
    );
    expect(fields).toEqual({ email: 'x@example.com' });
    expect([...unrecognized]).toEqual(['Favourite Colour']);
  });
});
