function getParams() {
  const search = window.location.search;
  if (!search || !search.length) {
    return null;
  }

  return new URLSearchParams(search.substr(1));
}

document.addEventListener('DOMContentLoaded', async function() {
  const params = getParams();
  if (!params) {
    throw new Exception('Cannot parse params.');
  }

  // Fetch the service data based on the origin.
  const origin = params.get('origin');
  let service = await ParanoidStorage.getService(origin);
  if (!service) {
    service = await ParanoidStorage.createService(origin);
  }

  // Generate a new RSA key for the service if it does not exist.
  let key;
  const rsa = new JSEncrypt();
  if (!service.key) {
    key = rsa.getKey();
    console.log('generated new public key:', key.getPublicBaseKeyB64());
    await ParanoidStorage.setServiceKey(origin, key.getPrivateBaseKeyB64());
  } else {
    rsa.setPrivateKey(service.key);
    key = rsa.getKey();
  }

  // Check if an existing UID exists for this service.
  if (!service.uid) {
    document.querySelector('.register-text').removeAttribute('style');
  } else {
    document.querySelector('.login-text').removeAttribute('style');
    document.querySelector('.uid').innerHTML = service.uid;
  }

  // Replace template tags with data from query string.
  const keys = ['app_name', 'origin'];
  keys.forEach(function(key) {
    const value = params.get(key);
    document.querySelectorAll(`.${key}`).forEach(function(el) {
      el.innerHTML = value;
    });
  });
  document.querySelector('.pubkey-full').innerHTML = key.getPublicKey();

  // Bind values to the form.
  const form = document.querySelector('form');
  form.querySelector('input[name=state]').value = params.get('state');
  if (!service.uid) {
    form.setAttribute('action', new URL(params.get('register_callback'), origin));
    form.querySelector('input[name=pubkey]').value = key.getPublicBaseKeyB64();
  } else {
    form.setAttribute('action', new URL(params.get('login_callback'), origin));
    form.querySelector('input[name=uid]').value = service.uid;
  }

  // Add button event handlers.
  document.querySelector('button.deny').addEventListener('click', function() {
    window.close();
  });
});
