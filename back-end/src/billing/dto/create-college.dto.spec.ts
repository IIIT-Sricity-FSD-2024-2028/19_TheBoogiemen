/**
 * create-college.dto.spec.ts — a SPOC's name must be mandatory.
 *
 * Before this fix, an empty/missing first_name on either SPOC-creation path
 * (SpocDetailsDto here, OnboardingStartDto for self-service) sailed through
 * validation and colleges.service.ts silently named the account after the
 * email's own local-part. These assert the boundary now rejects it, the same
 * way the global ValidationPipe (main.ts) would on a real request.
 */
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SpocDetailsDto } from './create-college.dto';
import { OnboardingStartDto } from './onboarding-start.dto';

const VALID_SPOC = {
  email: 'spoc@stxaviers.edu',
  first_name: 'Anita',
  last_name: 'Rao',
};

const VALID_ONBOARDING_START = {
  email: 'spoc@stxaviers.edu',
  password: 'Str0ng!Pass',
  first_name: 'Anita',
  college: { name: 'St. Xavier College of Engineering' },
};

describe('SpocDetailsDto', () => {
  it('rejects a missing first_name', async () => {
    const { first_name, ...rest } = VALID_SPOC;
    const errors = await validate(plainToInstance(SpocDetailsDto, rest));
    expect(errors.some((e) => e.property === 'first_name')).toBe(true);
  });

  it('rejects an empty-string first_name', async () => {
    const errors = await validate(plainToInstance(SpocDetailsDto, { ...VALID_SPOC, first_name: '' }));
    expect(errors.some((e) => e.property === 'first_name')).toBe(true);
  });

  it('accepts a real first_name', async () => {
    const errors = await validate(plainToInstance(SpocDetailsDto, VALID_SPOC));
    expect(errors).toHaveLength(0);
  });

  it('still allows last_name to be omitted', async () => {
    const { last_name, ...rest } = VALID_SPOC;
    const errors = await validate(plainToInstance(SpocDetailsDto, rest));
    expect(errors).toHaveLength(0);
  });
});

describe('OnboardingStartDto', () => {
  it('rejects a missing first_name', async () => {
    const { first_name, ...rest } = VALID_ONBOARDING_START;
    const errors = await validate(plainToInstance(OnboardingStartDto, rest), { whitelist: false });
    expect(errors.some((e) => e.property === 'first_name')).toBe(true);
  });

  it('accepts a real first_name', async () => {
    const errors = await validate(plainToInstance(OnboardingStartDto, VALID_ONBOARDING_START));
    expect(errors).toHaveLength(0);
  });
});
