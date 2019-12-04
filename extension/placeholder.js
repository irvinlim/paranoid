/*
 * Contains placeholder replacement logic, which will be executed on the service application's page.
 * Attaches a closed shadow root to encapsulate private user fields, which will be inaccessible to the JS runtime.
 */

(async () => {
  const service = await ParanoidStorage.getService(origin);
  if (!service) {
    return;
  }

  const identities = await ParanoidStorage.getServiceIdentities(origin);

  const tags = document.getElementsByTagName('paranoid');
  for (let tag of tags) {
    const uid = tag.getAttribute('uid');
    const attribute = tag.getAttribute('attribute');

    for (let identity of identities) {
      const identityUid = identity.uid.toString();

      if (uid === identityUid || uid in service.info.foreign_map) {
        let unmasked_data = '';
        if (uid === identityUid) {
          unmasked_data = identity.map[attribute];
        } else {
          unmasked_data = service.info.foreign_map[uid][attribute];
        }

        // Clear placeholder contents and append span element to house shadow root
        const replacement_span = document.createElement('span');
        tag.innerHTML = '';
        tag.appendChild(replacement_span);

        // Attach shadow root containing private data
        const shadow = replacement_span.attachShadow({ mode: 'closed' });
        const placeholder_replacement = document.createTextNode(unmasked_data);
        shadow.appendChild(placeholder_replacement);

        break;
      }
    }
  }
})();
