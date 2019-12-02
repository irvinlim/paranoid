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

async function postFormXHR(dest, data) {
  const FD = new FormData();

  // Push our data into our FormData object
  for (name in data) {
    FD.append(name, data[name]);
  }

  return await sendXHR('POST', dest, FD, {
    withCredentials: true,
    headers: {
      'X-CSRFToken': params.get('state'),
    },
  });
}

function postFormForeground(dest, data) {
  data.push(['csrfmiddlewaretoken', params.get('state')]);

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = dest;

  for (let [name, value] of data) {
    const element = document.createElement('input');
    element.name = name;
    element.value = value;
    element.type = 'hidden';
    form.appendChild(element);
  }

  document.body.appendChild(form);

  form.submit();
}
