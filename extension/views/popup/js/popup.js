(async () => {
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
    await ParanoidStorage.setServiceIdentityMap(origin, uid, key, newValue);
  });
})();

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
