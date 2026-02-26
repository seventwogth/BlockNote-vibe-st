import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ToastProvider } from './hooks/useToast.tsx'
import { ThemeProvider } from './hooks/useTheme.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
