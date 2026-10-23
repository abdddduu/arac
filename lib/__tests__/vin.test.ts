import { describe, expect, it } from 'vitest';
import { isValidVin, maskVin, vinCheckDigitValid } from '@/lib/vin';

describe('isValidVin', () => {
  it('accepts a valid 17-character VIN', () => {
    expect(isValidVin('W0L000055T2123456')).toBe(true);
  });

  it('rejects VINs that are not 17 characters', () => {
    expect(isValidVin('W0L000055T212345')).toBe(false);
    expect(isValidVin('W0L000055T21234567')).toBe(false);
  });

  it('rejects lowercase characters', () => {
    expect(isValidVin('w0l000055t2123456')).toBe(false);
  });

  it('rejects the letters I, O and Q', () => {
    expect(isValidVin('W0L0000I5T2123456')).toBe(false);
    expect(isValidVin('W0L0000O5T2123456')).toBe(false);
    expect(isValidVin('W0L0000Q5T2123456')).toBe(false);
  });

  it('rejects non-alphanumeric characters', () => {
    expect(isValidVin('W0L000055T2123456'.replace('5', '-'))).toBe(false);
  });

  it('accepts a VIN whose check digit is wrong', () => {
    expect(isValidVin('W0L000058T2123456')).toBe(true);
  });
});

describe('vinCheckDigitValid', () => {
  it('accepts a VIN with a correct check digit', () => {
    expect(vinCheckDigitValid('W0L000055T2123456')).toBe(true);
    expect(vinCheckDigitValid('1M8GDM9AXKP042788')).toBe(true);
  });

  it('rejects a VIN with a wrong check digit', () => {
    expect(vinCheckDigitValid('W0L000058T2123456')).toBe(false);
  });

  it('rejects an invalid VIN', () => {
    expect(vinCheckDigitValid('short')).toBe(false);
  });
});

describe('maskVin', () => {
  it('masks the first 11 characters and keeps the last 6', () => {
    expect(maskVin('W0L000055T2123456')).toBe('***********123456');
  });
});
