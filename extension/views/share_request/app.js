const params = getParams();
if (!params) {
  throw new Error('Cannot parse params.');
}

function getParams() {
  const search = window.location.search;
  if (!search || !search.length) {
    return null;
  }

  return new URLSearchParams(search.substr(1));
}

const setText = text => el => {
  el.innerHTML = text;
};

async function approve(origin, uid, field_name, username) {
  document.querySelector('#confirm-error-container').style.display = 'none';

  try {
    // Add to foreign map.
    await ParanoidStorage.addServiceForeignMap(origin, uid, field_name, username);

    // Close the window.
    window.close();
  } catch (e) {
    document.querySelector('#confirm-error-container').style.display = 'block';
    document.querySelector('.btn.approve').style.display = 'none';
  }
}

function deny() {
  // Close the window.
  window.close();
}

document.addEventListener('DOMContentLoaded', async function() {
  const origin = params.get('origin');
  const uid = params.get('uid');
  const field_name = params.get('field_name');
  const username = params.get('username');

  // Replace template tags
  document.querySelectorAll('.origin').forEach(setText(origin));
  document.querySelectorAll('.uid').forEach(setText(uid));
  document.querySelectorAll('.field_name').forEach(setText(field_name));
  document.querySelectorAll('.username').forEach(setText(username));
  document.querySelector('#confirm-error-container').style.display = 'none';

  // Add Keybase profile link.
  document.querySelector('.username-link').setAttribute('href', getKeybaseProfile(username));

  // Add Keybase avatar.
  const avatar = await getKeybaseAvatar(username);
  document.querySelector('.user-avatar').setAttribute('src', avatar);

  // Register button handlers
  document.querySelector('button.approve').addEventListener('click', async function() {
    const buttons = document.getElementsByClassName('btn');
    buttons[0].disabled = true;
    buttons[0].innerHTML = '<div class="loader">Processing...</div>';
    buttons[1].disabled = true;
    buttons[1].style.display = 'none';
    await approve(origin, uid, field_name, username);
  });
  document.querySelector('button.deny').addEventListener('click', deny);
});
