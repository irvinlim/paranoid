(async () => {
  const alive = await ParanoidStorage.checkAlive();
  const authorized = await ParanoidStorage.checkToken();

  // Display daemon status in settings
  await prepareSettingsTab();

  // Populate services if authorized
  if (alive && authorized) {
    await prepareServicesTab();
  }
})();

async function prepareSettingsTab() {
  async function updateDaemonStatus() {
    const alive = await ParanoidStorage.checkAlive();
    const authorized = await ParanoidStorage.checkToken();

    const el = document.querySelector('#daemon-status');
    el.innerHTML = 'checking...';
    el.className = '';

    if (!alive) {
      el.innerHTML = 'not running';
      el.classList.add('text-error');
    } else if (!authorized) {
      el.innerHTML = 'incorrect token';
      el.classList.add('text-warning');
    } else {
      el.innerHTML = 'running';
      el.classList.add('text-success');
    }
  }

  // Update daemon status
  await updateDaemonStatus();

  // Set daemon URL via textbox
  const daemonURLInput = document.querySelector('#daemon-url-input');
  daemonURLInput.value = (await ParanoidStorage.getDaemonURL()) || '';
  daemonURLInput.addEventListener('change', async function(e) {
    // Save to localStorage.
    await ParanoidStorage.setDaemonURL(e.target.value);

    // Recheck daemon status.
    await updateDaemonStatus();
  });

  // Set session token via textbox
  const sessionTokenInput = document.querySelector('#session-token-input');
  sessionTokenInput.value = (await ParanoidStorage.getSessionToken()) || '';
  sessionTokenInput.addEventListener('change', async function(e) {
    // Save to localStorage.
    await ParanoidStorage.setSessionToken(e.target.value);

    // Recheck daemon status.
    await updateDaemonStatus();
  });
}

async function prepareServicesTab() {
  const origins = await ParanoidStorage.getOrigins();

  const accordian = document.getElementById('accordionExample');
  accordian.innerHTML = ''; //clear accordian

  for (let origin of origins) {
    const originKey = origin
      .replaceAll('.', '')
      .replaceAll(':', '-')
      .replaceAll('/', '');

    // Handle multiple identities
    const identities = await ParanoidStorage.getServiceIdentities(origin);

    for (let identity of identities) {
      const uid = identity.uid;
      const identityKey = `${originKey}_${uid}`;

      accordian.innerHTML +=
        '<div class="card">' +
        `<div class="card-header" id="heading_${identityKey}">` +
        '<h2 class="mb-0">' +
        `<button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse_${identityKey}" aria-expanded="true" aria-controls="collapse_${identityKey}">` +
        `${origin} (UID: ${uid})` +
        '</button>' +
        '</h2>' +
        '</div>' +
        `<div id="collapse_${identityKey}" class="collapse" aria-labelledby="heading_${identityKey}" data-parent="#accordionExample">` +
        '<div class="card-body">' +
        '<table class="table">' +
        '<thead class="thead-light">' +
        '<tr>' +
        '<th scope="col">Placeholder Key</th>' +
        '<th scope="col">Value</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>' +
        getKeyValueHTML(identity) +
        '</tbody>' +
        '</table>' +
        '</div>' +
        '</div>' +
        '</div>';
    }
  }

  $('.editable').editable({
    type: 'text',
    placement: 'left',
  });

  $('.editable').on('save', async function(e, params) {
    const { newValue } = params;
    const origin = e.target.getAttribute('origin');
    const uid = e.target.getAttribute('uid');
    const key = e.target.getAttribute('key');
    await ParanoidStorage.setServiceIdentityMap(
      ParanoidStorage.keyToOrigin(origin),
      uid,
      key,
      newValue
    );
  });
}

function getKeyValueHTML(identity) {
  let html = '';

  for (let key in identity.map) {
    html +=
      '<tr>' +
      `<td>${key}</td>` +
      `<td class="editable" origin="${identity.origin}" uid="${identity.uid}" key="${key}">${identity.map[key]}</td>` +
      '</tr>';
  }

  return html;
}

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};
