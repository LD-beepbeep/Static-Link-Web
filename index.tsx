
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ✅ Add this BELOW your render code — it won’t break your app.
if ('serviceWorker' in navigator) {
  // register your service worker
  navigator.serviceWorker.register('/service-worker.js').then(() => {
    console.log('Service Worker registered');

    // ask for notification permission once the SW is ready
    if ('Notification' in window) {
      Notification.requestPermission().then(result => {
        if (result === 'granted') {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('Welcome to StaticLink', {
              body: 'Your app is now installed!',
              icon: '/icons/icon-192.png'
            });
          });
        }
      });
    }

  }).catch(err => console.error('Service Worker registration failed', err));
}
