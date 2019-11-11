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

  // Fetch the origin data.
  const origin = params.get('origin');
  let originData = await ParanoidStorage.getOrigin(origin);
  if (!originData) {
    originData = await ParanoidStorage.createOrigin(origin);
  }

  // Generate a new RSA key for the origin if it does not exist.
  let key;
  const rsa = new JSEncrypt();
  if (!originData.key) {
    key = rsa.getKey();
    console.log('generated new public key:', key.getPrivateBaseKeyB64());
    await ParanoidStorage.setOriginKey(origin, key.getPrivateBaseKeyB64());
  } else {
    rsa.setPrivateKey(originData.key);
    key = rsa.getKey();
  }

  // Check if an existing UID exists for this origin.
  if (!originData.uid) {
    document.querySelector('.register-text').removeAttribute('style');
  } else {
    document.querySelector('.login-text').removeAttribute('style');
    document.querySelector('.uid').innerHTML = originData.uid;
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
  if (!originData.uid) {
    form.setAttribute('action', new URL(params.get('register_callback'), origin));
    form.querySelector('input[name=pubkey]').value = key.getPublicBaseKeyB64();
  } else {
    form.setAttribute('action', new URL(params.get('login_callback'), origin));
    form.querySelector('input[name=uid]').value = originData.uid;
  }

  // Add button event handlers.
  document.querySelector('button.deny').addEventListener('click', function() {
    window.close();
  });
});
