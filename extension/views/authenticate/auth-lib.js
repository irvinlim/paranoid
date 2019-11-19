const params = getParams();
if (!params) {
  throw new Exception('Cannot parse params.');
}

function getParams() {
  const search = window.location.search;
  if (!search || !search.length) {
    return null;
  }

  return new URLSearchParams(search.substr(1));
}

async function postFormXHR(dest, data) {
  return new Promise((resolve, reject) => {
    var XHR = new XMLHttpRequest();
    var FD = new FormData();

    // Push our data into our FormData object
    for (name in data) {
      FD.append(name, data[name]);
    }

    // Define what happens on successful data submission
    XHR.addEventListener('load', function(event) {
      // Check for 200 status code
      if (event.target.status !== 200) {
        reject(new Error('Non-200 status code returned: ' + event.target.status));
        return;
      }

      // Parse as JSON
      const json = JSON.parse(event.target.response);

      // Check if response was successful, if a status field is returned.
      if ('status' in json && json.status !== 'success') {
        reject(new Error('Request not sucessful: ' + json));
        return;
      }

      // Resolve with parsed JSON object.
      resolve(json);
    });

    // Define what happens in case of error
    XHR.addEventListener('error', function(event) {
      console.log('Oops! Something went wrong: ' + dest);
      reject(event);
    });

    // Set up our request
    XHR.open('POST', dest);
    XHR.withCredentials = true;
    XHR.setRequestHeader('X-CSRFToken', params.get('state'));

    // Send our FormData object; HTTP headers are set automatically
    XHR.send(FD);
  });
}

function postFormForeground(dest, data) {
  data.push(['csrfmiddlewaretoken', params.get('state')]);
  document.cookie =
    'csrftoken=' +
    params.get('csrfcookie') +
    '; path=/; expires=' +
    new Date(new Date().getTime() + 30 * 24 * 3600 * 1000).toGMTString();
  console.log(document.cookie);
  var form = document.createElement('form');
  form.method = 'POST';
  form.action = dest;

  for (let i = 0; i < data.length; i++) {
    let data_entry = data[i];
    let element = document.createElement('input');
    element.name = data_entry[0];
    element.value = data_entry[1];
    element.type = 'hidden';
    form.appendChild(element);
  }

  document.body.appendChild(form);

  form.submit();
}
