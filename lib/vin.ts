const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function isValidVin(vin: string) {
  return VIN_PATTERN.test(vin);
}

const TRANSLITERATIONS: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function vinCheckDigitValid(vin: string) {
  if (!isValidVin(vin)) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const char = vin[i];
    const value = char >= 'A' ? TRANSLITERATIONS[char] : Number(char);
    sum += value * WEIGHTS[i];
  }
  const check = sum % 11;
  const expected = check === 10 ? 'X' : String(check);
  return vin[8] === expected;
}

export function maskVin(vin: string) {
  return '***********' + vin.slice(-6);
}
