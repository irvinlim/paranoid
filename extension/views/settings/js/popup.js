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

    const box = document.querySelector('#daemon-status-box');
    const text = document.querySelector('#daemon-status');
    text.innerHTML = 'checking...';
    text.className = '';
    box.className = 'alert alert-secondary';

    if (!alive) {
      text.innerHTML = 'Not running';
      text.classList.add('text-danger');
      box.classList.remove('alert-secondary');
      box.classList.add('alert-danger');
    } else if (!authorized) {
      text.innerHTML = 'Incorrect token';
      box.classList.remove('alert-secondary');
      box.classList.add('alert-warning');
    } else {
      text.innerHTML = 'Running';
      text.classList.add('text-success');
      box.classList.remove('alert-secondary');
      box.classList.add('alert-success');
    }
  }

  // Update daemon status
  await updateDaemonStatus();

  // Set daemon URL via textbox
  const daemonURLInput = document.querySelector('#daemon-url-input');
  daemonURLInput.value = (await ParanoidStorage.getDaemonURL()) || '';

  // Set session token via textbox
  const sessionTokenInput = document.querySelector('#session-token-input');
  sessionTokenInput.value = (await ParanoidStorage.getSessionToken()) || '';

  // Handle form
  const form = document.querySelector('#settings-form');
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    form.querySelector('button').innerHTML = 'Saving...';
    form.querySelector('button').disabled = true;

    // Save to localStorage.
    await ParanoidStorage.setDaemonURL(daemonURLInput.value);
    await ParanoidStorage.setSessionToken(sessionTokenInput.value);

    // Recheck daemon status.
    await updateDaemonStatus();

    form.querySelector('button').innerHTML = 'Save';
    form.querySelector('button').disabled = false;
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
        '<th scope="col">Field Name</th>' +
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
    await ParanoidStorage.setServiceIdentityMap(origin, uid, key, newValue);
  });

  $('#services-loading').remove();
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
