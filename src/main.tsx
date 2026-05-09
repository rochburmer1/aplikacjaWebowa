import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

// Twój Client ID z Google Cloud Console
const GOOGLE_CLIENT_ID = "462928557210-5id8rp0llgv8qkkcb19ma7ub4bc2o6hu.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)