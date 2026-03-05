import React from 'react'
import ReactDOM from 'react-dom/client'
import { SpacetimeDBProvider } from 'spacetimedb/react'
import App from './App'
import { createConnectionBuilder } from './lib/spacetime'
import './index.css'

const connectionBuilder = createConnectionBuilder()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      <App />
    </SpacetimeDBProvider>
  </React.StrictMode>,
)
