function openWelcome() {
  const welcomeURL = `chrome-extension://${chrome.runtime.id}/views/welcome/index.html`;
  chrome.tabs.create({ url: welcomeURL });
}

// Open welcome page on first install.
chrome.runtime.onInstalled.addListener(function({ reason }) {
  if (reason === 'install') {
    openWelcome();
  }
});

// Set browser action when icon is clicked.
chrome.browserAction.onClicked.addListener(function() {
  const settingsURL = `chrome-extension://${chrome.runtime.id}/views/settings/index.html`;
  chrome.tabs.create({ url: settingsURL });
});
