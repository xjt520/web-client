import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ mode }) => {
  const isSingleFile = mode === 'singlefile'

  return {
    plugins: [
      react(),
      // 仅在 singlefile 模式下启用单文件插件
      isSingleFile ? viteSingleFile() : null
    ].filter(Boolean),
    server: {
      port: 5174
    }
  }
})
