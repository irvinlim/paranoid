async function approve(key) {
  console.log('User Approves');

  const origin = params.get('origin');
  let service = await ParanoidStorage.getService(origin);
  if (!service) {
    // Initialize new service if it does not yet exist
    service = await ParanoidStorage.createService(origin);

    // Send POST request to service registration callback
    try {
      console.log('Service not registered. Registering service...');
      const registerURI = origin + params.get('register_callback');
      const { uid } = await postFormXHR(registerURI, { pub_key: key.getPublicBaseKeyB64() });
      await ParanoidStorage.setServiceKey(origin, key.getPrivateBaseKeyB64());
      await ParanoidStorage.setServiceUID(origin, uid);
      service.uid = uid;
    } catch {
      await ParanoidStorage.deleteService(origin);
    }
  }

  // Update placeholder map from service
  console.log('Updating placeholder map...');
  await updatePlaceholderMap(service);

  console.log('Logging into service...');
  let loginURI = origin + params.get('login_callback');
  let nonce, challenge_id;

  // Begin login request
  try {
    ({ nonce, challenge_id } = await postFormXHR(loginURI, {
      state: params.get('state'),
      uid: service.uid,
    }));
  } catch (e) {
    console.error(e);
    return;
  }

  // Complete nonce challenge by decrypting with private key
  const dec = new JSEncrypt();
  dec.setPrivateKey(key);
  const answer = dec.decrypt(nonce);

  // Return a hash of the decrypted answer
  // TODO: Use SHA-256 instead of MD5
  const payload = CryptoJS.MD5(challenge_id + ':' + answer).toString();
  const formData = [
    ['uid', service.uid],
    ['challenge_id', challenge_id],
    ['signature', payload],
  ];

  // Send back login challenge reply via foreground POST
  postFormForeground(loginURI, formData);
}

function deny() {
  window.close();
}

// Fetch and update the placeholder map for a service.
async function updatePlaceholderMap(service) {
  const origin = service.origin;
  const mapURI = origin + params.get('map_path');
  const { placeholders } = await postFormXHR(mapURI, {});

  // Initialize placeholder mappings for service.
  for (let placeholder of placeholders) {
    if (!(placeholder in service.map)) {
      await ParanoidStorage.setServiceMap(origin, placeholder, 'EMPTY');
    }
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  const origin = params.get('origin');

  // Fetch the service data based on the origin.
  const service = await ParanoidStorage.getService(origin);

  // Generate a new RSA key for the service if it does not exist.
  const rsa = new JSEncrypt();
  let key;
  if (!service) {
    key = rsa.getKey();
    console.log('generated new public key:', key.getPublicBaseKeyB64());
    document.querySelector('.register-text').removeAttribute('style');
  } else {
    rsa.setPrivateKey(service.key);
    key = rsa.getKey();
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

  // Add button event handlers.
  document.querySelector('button.approve').addEventListener('click', async () => {
    await approve(key);
  });
  document.querySelector('button.deny').addEventListener('click', deny);
});
