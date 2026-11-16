// Cascade order first: every Grocery Empire layer (and the shell's kit buttons) resolves against it.
import './games/grocery-empire/ui/design/layers.css'
import './games/grocery-empire/ui/design/tokens.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@fontsource/libre-baskerville/400.css'
import '@fontsource/libre-baskerville/700.css'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource-variable/fraunces'
import App from './App'
import './index.css'
import './shell/ds.css'

// Site shell shares the game's design tokens (see design/tokens.css `.shell-ds`).
document.documentElement.classList.add('shell-ds')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
