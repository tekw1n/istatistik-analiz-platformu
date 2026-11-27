import { describe, expect, it } from 'vitest';

const sources = import.meta.glob<string>('../src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Layers of the statistics engine and what each may import besides itself. */
const ENGINE: Record<string, string[]> = {
  utils: [],
  math: [],
  distributions: ['math', 'utils'],
  chiSquare: ['math', 'distributions', 'utils'],
};

interface Import {
  target: string;
  typeOnly: boolean;
}

function resolve(from: string, specifier: string): string {
  if (!specifier.startsWith('.')) return specifier;
  const parts = from.split('/').slice(0, -1);
  for (const part of specifier.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  const path = parts.join('/');
  return [`${path}.ts`, `${path}.tsx`].find((candidate) => candidate in files) ?? path;
}

const files: Record<string, string> = Object.fromEntries(
  Object.entries(sources).map(([path, code]) => [path.replace('../src/', ''), code]),
);

const imports: Record<string, Import[]> = Object.fromEntries(
  Object.entries(files).map(([path, code]) => {
    const found = [...code.matchAll(/^(import|export)\s+(type\s+)?[^;]*?from\s+'([^']+)'/gm)].map(
      (m) => ({ target: resolve(path, m[3]!), typeOnly: m[2] !== undefined }),
    );
    // Side effect and dynamic imports.
    for (const m of code.matchAll(/(?:^import\s+|import\()'([^']+)'/gm)) {
      found.push({ target: resolve(path, m[1]!), typeOnly: false });
    }
    return [path, found];
  }),
);

const layerOf = (path: string) => path.split('/')[0]!;
const engineFiles = Object.keys(files).filter((path) => layerOf(path) in ENGINE);

describe('architecture', () => {
  it('finds the sources and their imports', () => {
    expect(engineFiles.length).toBeGreaterThan(25);
    expect(imports['chiSquare/hypothesisTest.ts']!.map((i) => i.target)).toContain(
      'chiSquare/merging.ts',
    );
  });

  it.each(engineFiles)('%s depends only on lower engine layers', (path) => {
    const allowed = [layerOf(path), ...ENGINE[layerOf(path)]!];
    for (const { target } of imports[path]!) {
      // Package imports (React, KaTeX, Recharts) have no known layer and fail here as well.
      expect(allowed, `${path} imports ${target}`).toContain(layerOf(target));
    }
  });

  it.each(engineFiles)('%s does not touch the browser', (path) => {
    expect(files[path]).not.toMatch(/\b(window|document|localStorage|navigator|fetch)\s*[.(]/);
  });

  it('has no runtime import cycle', () => {
    const done = new Set<string>();
    const visit = (path: string, trail: string[]) => {
      expect(trail, `cycle: ${[...trail, path].join(' -> ')}`).not.toContain(path);
      if (done.has(path)) return;
      for (const { target, typeOnly } of imports[path] ?? []) {
        if (!typeOnly) visit(target, [...trail, path]);
      }
      done.add(path);
    };
    Object.keys(files).forEach((path) => visit(path, []));
  });

  it('sends no data anywhere', () => {
    for (const [path, code] of Object.entries(files)) {
      expect(code, path).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\b\s*\(/);
    }
  });
});
