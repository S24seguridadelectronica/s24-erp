
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/globals.css';

// Navegador web: URLs limpias.
// APK con Capacitor: URLs con hash.
// Este archivo debe ser el único lugar donde se configura el router.
const Router = Capacitor.isNativePlatform()
  ? HashRouter
  : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
