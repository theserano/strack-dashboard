import { describe, expect, it } from 'vitest';
import { passwordFormError, passwordStrength } from './passwordForm';

describe('passwordFormError', () => {
  const ok = { currentPassword: 'oldpass123', newPassword: 'newpass1234', confirm: 'newpass1234' };
  it('accepts a valid change', () => expect(passwordFormError(ok)).toBeNull());
  it('requires the current password', () => expect(passwordFormError({ ...ok, currentPassword: '' })).toContain('current'));
  it('enforces the signup length rule', () => expect(passwordFormError({ ...ok, newPassword: 'short1', confirm: 'short1' })).toContain('at least 8'));
  it('rejects an unchanged password', () => expect(passwordFormError({ ...ok, newPassword: 'oldpass123', confirm: 'oldpass123' })).toContain('different'));
  it('requires the confirmation to match', () => expect(passwordFormError({ ...ok, confirm: 'nope' })).toContain("don't match"));
});

describe('passwordStrength', () => {
  it('scores', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('abc').label).toBe('Too short');
    expect(passwordStrength('Abcdefg1!x').score).toBe(4);
  });
});
