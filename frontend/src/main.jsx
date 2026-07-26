import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './clay.css'
import App from './App.jsx'

// Soft Clay ground applied app-wide
document.body.classList.add('clay-app')

const root = createRoot(document.getElementById('root'))
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Remove the global loader once React has mounted
const globalLoader = document.getElementById('global-loader')
if (globalLoader && globalLoader.parentNode) {
  globalLoader.parentNode.removeChild(globalLoader)
}
