/**
 * Shared password validation rules.
 * Used on both backend (auth controller) and frontend (signup / change-password).
 */

export interface PasswordCheck {
  key: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordCheck[] = [
  { key: 'length', label: 'Minim 8 caractere', test: (pw) => pw.length >= 8 },
  { key: 'upper', label: 'Cel puțin o literă mare', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'digit', label: 'Cel puțin o cifră', test: (pw) => /[0-9]/.test(pw) },
  { key: 'special', label: 'Cel puțin un caracter special', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

/**
 * Validate a password against all rules.
 * Returns an array of failing rule labels (empty = valid).
 */
export function validatePassword(password: string): string[] {
  return PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.label);
}

/**
 * Returns a score 0–4 indicating how many rules pass.
 */
export function passwordStrength(password: string): number {
  return PASSWORD_RULES.filter((r) => r.test(password)).length;
}
