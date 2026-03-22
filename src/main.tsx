import { render } from 'preact'
import { App } from './App'
import './app.css'
import './schema-nodes.css'

const baseUrl = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
document.documentElement.style.setProperty('--tooltip-border-image', `url('${baseUrl}images/tooltip.png')`)

render(<App />, document.getElementById('app') as HTMLElement)
