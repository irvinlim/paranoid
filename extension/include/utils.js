async function sendXHR(method, dest, data, options) {
  return new Promise((resolve, reject) => {
    var XHR = new XMLHttpRequest();

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
      console.error('Oops! Something went wrong: ' + dest);
      reject(event);
    });

    XHR.open(method, dest);

    // Process options.
    if (options) {
      // Add additional headers.
      if (options.headers) {
        for (let header in options.headers) {
          XHR.setRequestHeader(header, options.headers[header]);
        }
      }

      // Determine whether to enable cross-site cookie requests.
      if (options.withCredentials === true) {
        XHR.withCredentials = true;
      }
    }

    // Send data
    XHR.send(data);
  });
}
