import type { TranslationTree } from './locales/en';

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) {
    return template;
  }
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return s;
}

export function translate(
  tree: TranslationTree,
  path: string,
  vars?: Record<string, string | number>,
): string {
  const parts = path.split('.');
  let cur: unknown = tree;
  for (const p of parts) {
    if (cur === null || typeof cur !== 'object') {
      return interpolate(path, vars);
    }
    cur = (cur as Record<string, unknown>)[p];
  }
  const raw = typeof cur === 'string' ? cur : path;
  return interpolate(raw, vars);
}
