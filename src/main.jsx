import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      dir="rtl"
      richColors
      closeButton
      theme="dark"
      toastOptions={{
        style: {
          fontFamily: 'Cairo, sans-serif',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      }}
    />
  </React.StrictMode>
);