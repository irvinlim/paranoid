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

chrome.browserAction.onClicked.addListener(openWelcome);
