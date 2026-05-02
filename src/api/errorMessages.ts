import { useLocaleStore } from '../store/locale.store';

interface ErrorMap {
  [pattern: string]: { fr: string; en: string };
}

const ERROR_MAP: ErrorMap = {
  'Invalid credentials': {
    fr: 'Email ou mot de passe incorrect',
    en: 'Invalid email or password',
  },
  'Network error. Check your connection.': {
    fr: 'Erreur réseau. Vérifie ta connexion.',
    en: 'Network error. Check your connection.',
  },
  'Something went wrong': {
    fr: "Une erreur s'est produite",
    en: 'Something went wrong',
  },
  'Email already registered': {
    fr: 'Cet email est déjà utilisé',
    en: 'Email already registered',
  },
  'Username already taken': {
    fr: "Ce nom d'utilisateur est déjà pris",
    en: 'Username already taken',
  },
  'User not found': {
    fr: 'Utilisateur introuvable',
    en: 'User not found',
  },
  'Password must contain at least one uppercase letter': {
    fr: 'Le mot de passe doit contenir au moins une majuscule',
    en: 'Password must contain at least one uppercase letter',
  },
  'Password must contain at least one lowercase letter': {
    fr: 'Le mot de passe doit contenir au moins une minuscule',
    en: 'Password must contain at least one lowercase letter',
  },
  'Password must contain at least one digit': {
    fr: 'Le mot de passe doit contenir au moins un chiffre',
    en: 'Password must contain at least one digit',
  },
  'Password must contain at least one special character': {
    fr: 'Le mot de passe doit contenir au moins un caractère spécial',
    en: 'Password must contain at least one special character',
  },
  'password must be longer than or equal to 8 characters': {
    fr: 'Le mot de passe doit contenir au moins 8 caractères',
    en: 'Password must be at least 8 characters long',
  },
  'email must be an email': {
    fr: 'Email invalide',
    en: 'Invalid email',
  },
  'Invalid or expired reset code': {
    fr: 'Code invalide ou expiré',
    en: 'Invalid or expired reset code',
  },
  'Too many requests': {
    fr: 'Trop de tentatives. Réessaie plus tard.',
    en: 'Too many requests. Try again later.',
  },
};

export function translateError(message: string | string[]): string {
  const locale = useLocaleStore.getState().locale;
  const text = Array.isArray(message) ? message[0] : message;

  // Exact match first
  if (ERROR_MAP[text]) {
    return ERROR_MAP[text][locale];
  }

  // Substring match (validation messages can have variations)
  for (const pattern of Object.keys(ERROR_MAP)) {
    if (text.toLowerCase().includes(pattern.toLowerCase())) {
      return ERROR_MAP[pattern][locale];
    }
  }

  return text;
}
