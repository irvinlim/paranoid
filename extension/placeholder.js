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

(async () => {
  const foreignMap = await ParanoidStorage.getServiceForeignMap(origin);
  const identities = await ParanoidStorage.getServiceIdentities(origin);

  const tags = document.getElementsByTagName('paranoid');
  for (let tag of tags) {
    const uid = tag.getAttribute('uid');
    const attribute = tag.getAttribute('attribute');

    for (let identity of identities) {
      const identityUid = identity.uid.toString();

      if (uid === identityUid && attribute in identity.map) {
        replaceTag(tag, identity.map[attribute]);
        break;
      }

      if (uid in foreignMap && attribute in foreignMap[uid]) {
        replaceTag(tag, foreignMap[uid][attribute]);
        break;
      }
    }
  }
})();
