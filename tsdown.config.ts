import { defineConfig } from 'tsdown'

/**
 * Self-contained runtime transpile: emits lib/*.js straight from src/ with no
 * project references and no type checking, so `prepare` works on a bare git
 * install inside a dsh profile. Types come from `tsc -p tsconfig.json`
 * (emitDeclarationOnly into lib/types); `pnpm build` runs both.
 */
export default defineConfig({
  entry: ['src/index.ts', 'src/invariant.ts', 'src/prompt.ts', 'src/startup.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  // pi-tui carries a pnpm patch (patches/) that only applies inside THIS
  // repo's install, so the patched copy is baked into lib/ instead of being
  // declared a runtime dependency; its own deps stay external and are
  // declared as this package's dependencies. onlyBundle doubles as a guard:
  // the build fails if anything else sneaks into the bundle.
  deps: {
    alwaysBundle: ['@earendil-works/pi-tui'],
    onlyBundle: ['@earendil-works/pi-tui'],
  },
})
