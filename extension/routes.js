// Returns the query passed from the protocol handler.
// Should look like `web+proto://path?q=val`
function getQuery() {
  const search = window.location.search;
  if (!search || !search.length) {
    return null;
  }

  const params = new URLSearchParams(search.substr(1));
  const fullURL = params.get('q');
  if (!fullURL || !fullURL.length) {
    return null;
  }

  return fullURL;
}

// Parses the protocol URL from the query, and returns a route to redirect to.
function getRoute(query) {
  const url = new URL(query);
  if (url.protocol !== 'web+paranoid:') {
    return null;
  }

  return {
    path: url.pathname.replace(/^\/\//, ''),
    search: url.searchParams,
  };
}

// Route incoming requests from the "web+paranoid:" protocol handler.
function handleRoute(route) {
  if (route === null) {
    return false;
  }

  switch (route.path) {
    case 'authenticate':
      return true;
    default:
      return false;
  }
}

function show404(query) {
  document.querySelector('div').removeAttribute('style');
  document.querySelector('pre').innerHTML = query;
}

document.addEventListener('DOMContentLoaded', function() {
  const query = getQuery();
  if (query === null) {
    return;
  }

  // Attempt to handle the route.
  const route = getRoute(query);
  if (!handleRoute(route)) {
    show404(query);
    return;
  }

  window.location = `chrome-extension://${chrome.runtime.id}/views/${route.path}/index.html?${route.search}`;
});
