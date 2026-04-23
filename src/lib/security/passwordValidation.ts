interface PasswordRule {
  pattern: RegExp;
  message: string;
}

const PASSWORD_RULES: PasswordRule[] = [
  { pattern: /.{8,}/, message: 'Password must be at least 8 characters' },
  { pattern: /[A-Z]/, message: 'Password must contain at least one uppercase letter' },
  { pattern: /[a-z]/, message: 'Password must contain at least one lowercase letter' },
  { pattern: /\d/, message: 'Password must contain at least one number' },
  {
    pattern: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    message: 'Password must contain at least one special character',
  },
];

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }

  for (const rule of PASSWORD_RULES) {
    if (!rule.pattern.test(password)) {
      return rule.message;
    }
  }

  return null;
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'text-danger-600' };
  if (score <= 4) return { score, label: 'Medium', color: 'text-yellow-600' };
  return { score, label: 'Strong', color: 'text-success-600' };
}
