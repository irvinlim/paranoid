/*
 * Contains placeholder replacement logic, which will be executed on the service application's page.
 * Attaches a closed shadow root to encapsulate private user fields, which will be inaccessible to the JS runtime.
 */

(async () => {
  const service = await ParanoidStorage.getService(origin);
  if (!service) {
    return;
  }

  const tags = document.getElementsByTagName('paranoid');
  for (let tag of tags) {
    const uid = parseInt(tag.getAttribute('uid'));
    const attribute = tag.getAttribute('attribute');
    // console.log(uid);
    // console.log(service.uid);
    // console.log(service.foreign_map);
    if (uid === service.uid || uid in service.foreign_map) {
      let unmasked_data = '';
      if (uid === service.uid) {
        unmasked_data = service.map[attribute];
      } else {
        unmasked_data = service.foreign_map[uid][attribute];
      }

      // Clear placeholder contents and append span element to house shadow root
      const replacement_span = document.createElement('span');
      tag.innerHTML = '';
      tag.appendChild(replacement_span);

      // Attach shadow root containing private data
      const shadow = replacement_span.attachShadow({ mode: 'closed' });
      const placeholder_replacement = document.createTextNode(unmasked_data);
      shadow.appendChild(placeholder_replacement);
    }
  }
})();
