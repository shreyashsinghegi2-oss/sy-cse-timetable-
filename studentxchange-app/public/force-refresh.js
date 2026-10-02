// Force refresh functionality for ensuring users get the latest version
window.addEventListener('load', function() {
  // Check if this is a refresh after logout
  const isLoggedOut = sessionStorage.getItem('just_logged_out');
  if (isLoggedOut) {
    sessionStorage.removeItem('just_logged_out');
    // Clear any remaining cache
    if ('caches' in window) {
      caches.keys().then(function(names) {
        names.forEach(function(name) {
          caches.delete(name);
        });
      });
    }
  }
  
  // Set cache-busting headers for fresh content
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Cache-Control';
  meta.content = 'no-cache, no-store, must-revalidate';
  document.getElementsByTagName('head')[0].appendChild(meta);
  
  const pragma = document.createElement('meta');
  pragma.httpEquiv = 'Pragma';
  pragma.content = 'no-cache';
  document.getElementsByTagName('head')[0].appendChild(pragma);
  
  const expires = document.createElement('meta');
  expires.httpEquiv = 'Expires';
  expires.content = '0';
  document.getElementsByTagName('head')[0].appendChild(expires);
});

// Function to force refresh with cache clearing
window.forceRefresh = function() {
  // Clear all possible caches
  if ('caches' in window) {
    caches.keys().then(function(names) {
      names.forEach(function(name) {
        caches.delete(name);
      });
    }).then(function() {
      // Add timestamp to force fresh load
      window.location.href = window.location.href + '?t=' + Date.now();
    });
  } else {
    window.location.href = window.location.href + '?t=' + Date.now();
  }
};