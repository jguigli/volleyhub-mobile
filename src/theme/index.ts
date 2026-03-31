import { colors } from './colors';

export { colors } from './colors';
export {
  GOOGLE_MAP_DARK_STYLE,
  useMapViewDarkModeProps,
} from './mapStyles';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.text },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, color: colors.textSecondary },
  caption: { fontSize: 11, fontWeight: '500' as const, color: colors.textMuted },
  button: { fontSize: 15, fontWeight: '600' as const },
};

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
};
