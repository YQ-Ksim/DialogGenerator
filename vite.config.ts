import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const pagesBase = process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/'

export default defineConfig({
  base: pagesBase,
  plugins: [preact()],
})