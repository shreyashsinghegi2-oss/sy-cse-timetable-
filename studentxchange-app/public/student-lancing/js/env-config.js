// Environment Configuration for StudentLancing
// This file loads Firebase config from server-provided environment variables

(function() {
  // The server will inject these values
  window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || {};
  
  // Fallback to hardcoded values if not provided by server
  // These will be replaced with actual values from environment
  const defaults = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
  };
  
  // Merge with any existing config
  Object.keys(defaults).forEach(key => {
    if (!window.FIREBASE_CONFIG[key]) {
      window.FIREBASE_CONFIG[key] = defaults[key];
    }
  });
})();
