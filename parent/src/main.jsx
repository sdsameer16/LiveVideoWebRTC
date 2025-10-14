// Polyfill for process.nextTick - MUST BE FIRST
if (typeof window !== 'undefined') {
  window.process = window.process || {};
  window.process.nextTick = window.process.nextTick || function(fn, ...args) {
    queueMicrotask(() => fn(...args));
  };
  window.process.env = window.process.env || {};
  window.global = window.global || window;
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
