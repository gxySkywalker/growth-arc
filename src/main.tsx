import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './focus.css'
import './world.css'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
