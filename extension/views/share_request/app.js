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
  // Add to foreign map.
  await ParanoidStorage.addServiceForeignMap(origin, uid, field_name, username);

  // Close the window.
  window.close();
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

  // Add Keybase profile link.
  document.querySelector('.username-link').setAttribute('href', `https://keybase.io/${username}`);

  // Add Keybase avatar.
  const url = new URL('https://keybase.io/_/api/1.0/user/lookup.json');
  url.searchParams.set('usernames', username);
  const res = await sendXHR('GET', url.href);
  const user = res.them[0];
  if ('pictures' in user) {
    document.querySelector('.user-avatar').setAttribute('src', user.pictures.primary.url);
  } else {
    const placeholderUrl = 'https://keybase.io/images/no-photo/placeholder-avatar-180-x-180@2x.png';
    document.querySelector('.user-avatar').setAttribute('src', placeholderUrl);
  }

  // Register button handlers
  document.querySelector('button.approve').addEventListener('click', async function() {
    await approve(origin, uid, field_name, username);
  });
  document.querySelector('button.deny').addEventListener('click', deny);
});
