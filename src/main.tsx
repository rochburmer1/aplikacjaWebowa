import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css' // Jeśli nie masz tego pliku, możesz po prostu usunąć tę linijkę

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)