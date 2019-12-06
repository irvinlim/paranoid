(async () => {
  $('#services-error').hide();

  const alive = await ParanoidStorage.checkAlive();
  const authorized = await ParanoidStorage.checkToken();

  // Display daemon status in settings
  await prepareSettingsTab();

  // Handle reload button
  $('#reload-page').click(reloadPage);

  // Load components on the page
  await reloadPage();
})();

async function reloadPage() {
  try {
    $('#reload-page').prop('disabled', true);
    $('#services-loading').show();
    await updateDaemonStatus();
    await prepareServicesTab();
  } catch {
    $('#services-error').show();
  } finally {
    $('#services-loading').hide();
    $('#reload-page').prop('disabled', false);
  }
}

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
    text.innerHTML = 'Connected';
    text.classList.add('text-success');
    box.classList.remove('alert-secondary');
    box.classList.add('alert-success');
  }
}

async function prepareSettingsTab() {
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
  $('#services-error').hide();

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
        '<th scope="col"></th>' +
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

  async function loadSharedUsers(origin, uid, fieldName) {
    // Clear existing items
    $('#shared-with .list-group-item').remove();
    $('#shared-with-loading').show();
    $('#shared-with').hide();

    let numRows = 0;

    // Fetch identity
    const identity = await ParanoidStorage.getServiceIdentity(origin, uid);
    if (identity) {
      for (let field in identity.fields) {
        if (field !== fieldName) {
          continue;
        }

        const sharedUsers = identity.fields[field].shared_with;
        for (let username of sharedUsers) {
          const listItem = $('#shared-with-list .d-none')
            .first()
            .clone()
            .addClass('list-group-item')
            .removeClass('d-none')
            .appendTo('#shared-with-list');

          const avatar = await getKeybaseAvatar(username);
          listItem.find('img').attr('src', avatar);
          listItem.find('h5 a').text(username);
          listItem.find('h5 a').attr('href', getKeybaseProfile(username));

          // Bind revoke button
          listItem.find('button').on('click', async function(e) {
            const btn = $(e.target);
            btn.prop('disabled', true);
            await ParanoidStorage.unshareServiceIdentityMap(origin, uid, fieldName, username);
            await loadSharedUsers(origin, uid, fieldName);
          });

          numRows++;
        }
      }
    }

    // Hide spinner and show rows
    $('#shared-with-loading').hide();
    if (numRows > 0) {
      $('#shared-with').show();
    }
  }

  $('.share-btn').on('click', async function(e) {
    const btn = $(e.target);
    const origin = btn.data('origin');
    const uid = btn.data('uid');
    const fieldName = btn.data('field-name');

    // Display all users that information is shared with.
    await loadSharedUsers(origin, uid, fieldName);

    // Bind form data
    $('#add-user-form').data('origin', origin);
    $('#add-user-form').data('uid', uid);
    $('#add-user-form').data('field-name', fieldName);
  });

  // Handle add user form
  $('#add-user-form').on('submit', async function(e) {
    e.preventDefault();

    const form = $(e.target);
    const origin = form.data('origin');
    const uid = form.data('uid');
    const fieldName = form.data('field-name');
    const username = form.find('input').val();

    if (!username) {
      return;
    }

    $('#add-user-form button').prop('disabled', true);
    form.find('input').removeClass('is-invalid');
    form.find('.invalid-feedback').html('');

    try {
      // Share identity map with user
      await ParanoidStorage.shareServiceIdentityMap(origin, uid, fieldName, username);

      // Refresh shared users
      await loadSharedUsers(origin, uid, fieldName);

      form.find('input').val('');
    } catch (e) {
      form.find('.invalid-feedback').html('Could not add user.');
      form.find('input').addClass('is-invalid');
    }

    $('#add-user-form button').prop('disabled', false);
  });

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
      `<td><button class="btn btn-secondary share-btn" data-toggle="modal" data-target="#share-modal" data-origin="${identity.origin}" data-uid="${identity.uid}" data-field-name="${key}">Share</button></td>` +
      '</tr>';
  }

  return html;
}

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};
