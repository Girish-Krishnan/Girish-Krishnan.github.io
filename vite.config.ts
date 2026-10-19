import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

/**
 * @dimforge/rapier3d-compat inlines its 1.5 MB WASM binary as a ~2.1 MB base64 string.
 * For production builds, swap that for the package's own .wasm file emitted as a
 * separate asset: smaller over the wire, cacheable, and compiled while streaming.
 */
function rapierExternalWasm(): Plugin {
  const wasmPath = fileURLToPath(
    new URL('./node_modules/@dimforge/rapier3d-compat/rapier_wasm3d_bg.wasm', import.meta.url),
  )
  return {
    name: 'rapier-external-wasm',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      if (!/@dimforge[\\/]rapier3d-compat[\\/]rapier\.mjs$/.test(id)) return
      const re = /(\w+)\(\w+\.toByteArray\("AGFzbQ[A-Za-z0-9+/=]+"\)\.buffer\)/
      if (!re.test(code)) {
        this.warn('rapier inline wasm pattern not found; leaving it inlined')
        return
      }
      return {
        code: `import __rapierWasmUrl from ${JSON.stringify(wasmPath + '?url')};\n` +
          code.replace(re, '$1({module_or_path: __rapierWasmUrl})'),
        map: null,
      }
    },
  }
}

// Served from the root of the user site (girish-krishnan.github.io).
export default defineConfig({
  base: '/',
  plugins: [rapierExternalWasm(), react()],
  build: {
    target: 'es2020',
    assetsInlineLimit: (file) => (file.endsWith('.wasm') ? false : undefined),
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@dimforge') || id.includes('@react-three/rapier')) return 'physics'
          if (id.includes('postprocessing')) return 'postfx'
          if (/node_modules[\\/](three)[\\/]/.test(id)) return 'three'
          if (id.includes('@react-three/drei') || id.includes('troika') || id.includes('three-stdlib') || id.includes('camera-controls') || id.includes('maath') || id.includes('meshline') || id.includes('three-mesh-bvh')) return 'drei'
          if (id.includes('@react-three/fiber') || id.includes('its-fine') || id.includes('react-reconciler') || id.includes('scheduler') || id.includes('suspend-react')) return 'r3f'
        },
      },
    },
  },
})
