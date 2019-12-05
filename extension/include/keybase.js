async function getKeybaseAvatar(username) {
  const url = new URL('https://keybase.io/_/api/1.0/user/lookup.json');
  url.searchParams.set('usernames', username);
  const res = await sendXHR('GET', url.href);
  const user = res.them[0];

  if ('pictures' in user) {
    return user.pictures.primary.url;
  }

  return 'https://keybase.io/images/no-photo/placeholder-avatar-180-x-180@2x.png';
}

function getKeybaseProfile(username) {
  return `https://keybase.io/${username}`;
}
