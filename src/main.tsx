import { render } from 'preact'
import { App } from './App'
import './app.css'
import './schema-nodes.css'

render(<App />, document.getElementById('app') as HTMLElement)
