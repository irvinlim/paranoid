async function approve(origin, uid, key) {
  console.log('User Approves');

  // Fetch list of placeholders
  const mapURI = origin + params.get('map_path');
  const { placeholders } = await postFormXHR(mapURI, {});

  // Create service identity
  if (uid === null) {
    // Send POST request to service registration callback
    console.log('Service not registered. Registering service...');
    const registerURI = origin + params.get('register_callback');
    ({ uid } = await postFormXHR(registerURI, { pub_key: key.getPublicBaseKeyB64() }));

    // Initialize new service identity
    console.log(`Creating service identity with UID ${uid}`);
    await ParanoidStorage.createServiceIdentity(
      origin,
      uid,
      key.getPrivateBaseKeyB64(),
      placeholders
    );
  }

  // Fetch service identity
  const identity = await ParanoidStorage.getServiceIdentity(origin, uid);
  if (!identity) {
    throw new Error(`Could not fetch service identity for uid ${uid}`);
  }

  // Update placeholder map for service identity
  console.log('Updating placeholder map...');
  await updatePlaceholderMap(identity, placeholders);

  console.log('Logging into service...');
  let loginURI = origin + params.get('login_callback');
  let nonce, challenge_id;

  // Begin login request
  try {
    ({ nonce, challenge_id } = await postFormXHR(loginURI, {
      uid,
      state: params.get('state'),
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
  const payload = CryptoJS.SHA256(challenge_id + ':' + answer).toString();
  const formData = [
    ['uid', uid],
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
async function updatePlaceholderMap(identity, placeholders) {
  const { origin, uid } = identity;

  // Initialize placeholder mappings for service.
  for (let placeholder of placeholders) {
    if (!(placeholder in identity.map)) {
      await ParanoidStorage.setServiceIdentityMap(origin, uid, placeholder, `{${placeholder}}`);
    }
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  const origin = params.get('origin');

  // Create a new service if it does not exist.
  let service = await ParanoidStorage.getService(origin);
  if (!service) {
    console.log(`Creating new service ${origin}`);
    service = await ParanoidStorage.createService(origin);
  }

  if (!service) {
    throw new Error('Could not fetch service');
  }

  // TODO: Handle multiple identities. For now just assumes a single identity per service.
  const identities = await ParanoidStorage.getServiceIdentities(origin);

  // Generate a new RSA key for the service if it does not exist.
  const rsa = new JSEncrypt();
  let key;
  let uid = null;
  if (identities.length === 0) {
    key = rsa.getKey();
    console.log('generated new public key:', key.getPublicBaseKeyB64());
    document.querySelector('.register-text').removeAttribute('style');
  } else {
    const identity = identities[0];
    uid = identity.uid;
    rsa.setPrivateKey(identity.key);
    key = rsa.getKey();
    document.querySelector('.login-text').removeAttribute('style');
    document.querySelector('.uid').innerHTML = uid;
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
    var buttons = document.getElementsByClassName("btn");
    buttons[0].disabled = true;
    buttons[0].innerHTML = '<div class="loader">Processing...</div>';
    buttons[1].disabled = true;
    buttons[1].style.display = 'none';
    await approve(origin, uid, key);
  });
  document.querySelector('button.deny').addEventListener('click', deny);
});
