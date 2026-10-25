/** Same rule as the server for signup and change password: at least 8 characters and at most 72 bytes (bcrypt ignores the rest). */
export const MIN_PASSWORD = 8;

export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string };

/** A hint only: the server enforces just the length. Counts length, case, digits and symbols. */
export const passwordStrength = (p: string): Strength => {
  if (!p) return { score: 0, label: '' };
  let score = 0;
  if (p.length >= MIN_PASSWORD) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) score++;
  return { score: score as Strength['score'], label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score] };
};

export function passwordFormError(f: { currentPassword: string; newPassword: string; confirm: string }): string | null {
  if (!f.currentPassword) return 'Enter your current password';
  if (f.newPassword.length < MIN_PASSWORD) return `New password must be at least ${MIN_PASSWORD} characters`;
  if (new TextEncoder().encode(f.newPassword).length > 72) return 'New password is too long';
  if (f.newPassword === f.currentPassword) return 'New password must be different from the current password';
  if (f.newPassword !== f.confirm) return "Passwords don't match";
  return null;
}
