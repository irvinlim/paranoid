const BASE_URL = window.location.origin;
const APP_NAME = 'Sample App';

function startAuthFlow() {
  // Prepare query string parameters
  const params = new URLSearchParams();
  params.set('app_name', APP_NAME);
  params.set('origin', BASE_URL);
  params.set('register_callback', '/auth/paranoid/register');
  params.set('login_callback', '/auth/paranoid/login');
  params.set('map_path', '/paranoid_map');
  params.set('state', document.querySelector('input[name=csrfmiddlewaretoken]').value);
  params.set('csrfcookie', getCookie('csrftoken'));

  // Open new window in Paranoid URL scheme
  let callbackWindow = window.open(
    `web+paranoid://authenticate?${params.toString()}`,
    '',
    'width=300,height=500'
  );

  // Wait for authentication flow to complete (user has to close the window explicitly)
  const interval = setInterval(function() {
    if (callbackWindow.closed) {
      clearInterval(interval);
      window.location.reload();
    }
  }, 1000);
}

document.addEventListener('DOMContentLoaded', function() {
  const loginBtn = document.querySelector('#login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', startAuthFlow);
  }
});

function getCookie(name) {
  var value = '; ' + document.cookie;
  var parts = value.split('; ' + name + '=');
  if (parts.length == 2)
    return parts
      .pop()
      .split(';')
      .shift();
}
