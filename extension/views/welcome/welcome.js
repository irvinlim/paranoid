console.log('registering new web+paranoid protocol handler');

// Register a new protocol handler for web+paranoid URLs.
navigator.registerProtocolHandler(
  'web+paranoid',
  `chrome-extension://${chrome.runtime.id}/routes.html?q=%s`,
  'Paranoid protocol handler'
);
