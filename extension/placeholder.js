/*
 * Contains placeholder replacement logic, which will be executed on the service application's page.
 * Attaches a closed shadow root to encapsulate private user fields, which will be inaccessible to the JS runtime.
 */

function replaceTag(tag, data) {
  // Clear placeholder contents and append span element to house shadow root
  const replacement_span = document.createElement('span');
  tag.innerHTML = '';
  tag.appendChild(replacement_span);

  // Attach shadow root containing private data
  const shadow = replacement_span.attachShadow({ mode: 'closed' });
  const placeholder_replacement = document.createTextNode(data);
  shadow.appendChild(placeholder_replacement);
}

async function getSelfIdentities(origin) {
  const identities = await ParanoidStorage.getServiceIdentities(origin);

  // Preprocess service identities into a map
  const identityMap = {};
  for (let identity of identities) {
    const uid = identity.uid.toString();
    identityMap[uid] = identity.map;
  }

  return identityMap;
}

async function getForeignIdentities(origin) {
  return await ParanoidStorage.getServiceForeignMap(origin);
}

(async () => {
  // Use current window origin for replacement.
  const origin = window.origin;

  // Get both self and foreign identities in parallel.
  const identityMaps = await Promise.all([getSelfIdentities(origin), getForeignIdentities(origin)]);

  // Replace all paranoid tags.
  const tags = document.getElementsByTagName('paranoid');
  for (let tag of tags) {
    const uid = tag.getAttribute('uid');
    const attribute = tag.getAttribute('attribute');

    for (let map of identityMaps) {
      if (uid in map && attribute in map[uid]) {
        replaceTag(tag, map[uid][attribute]);
      }
    }
  }
})();
