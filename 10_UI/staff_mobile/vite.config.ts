import { defineConfig, Plugin } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Transparent 1×1 PNG data URL (fallback when no file in src/assets/)
const PLACEHOLDER_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

function figmaAssetPlugin(): Plugin {
  const assetsDir = path.resolve(__dirname, './src/assets')
  console.log('[figma-asset] assetsDir =', assetsDir)
  console.log('[figma-asset] files =', fs.readdirSync(assetsDir).filter(f => f.endsWith('.png')))

  return {
    name: 'figma-asset',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) return '\0' + id
    },
    load(id) {
      if (!id.startsWith('\0figma:asset/')) return
      const filename = id.replace('\0figma:asset/', '')
      const assetPath = path.join(assetsDir, filename)
      const exists = fs.existsSync(assetPath)
      console.log(`[figma-asset] load "${filename}" → ${assetPath} exists=${exists}`)
      if (exists) {
        const buf = fs.readFileSync(assetPath)
        const base64 = buf.toString('base64')
        const mime = filename.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
        const dataUrl = `data:${mime};base64,${base64}`
        console.log(`[figma-asset] ✓ loaded ${filename} (${buf.length} bytes → data URL ${dataUrl.length} chars)`)
        return `export default ${JSON.stringify(dataUrl)}`
      }
      console.log(`[figma-asset] ✗ not found, using placeholder`)
      return `export default "${PLACEHOLDER_PNG}"`
    },
  }
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    figmaAssetPlugin(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
