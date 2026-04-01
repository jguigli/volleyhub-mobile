import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Returns a paddingBottom value that accounts for the home indicator / safe area. */
export function useBottomInset(extra = 16): number {
  const { bottom } = useSafeAreaInsets();
  return bottom + extra;
}
