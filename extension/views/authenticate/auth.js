function getParams() {
  const search = window.location.search;
  if (!search || !search.length) {
    return null;
  }

  return new URLSearchParams(search.substr(1));
}

async function submitForm_XHR(dest, data) {
  return new Promise(resolve => {
    var XHR = new XMLHttpRequest();
    var FD  = new FormData();

    // Push our data into our FormData object
    for(name in data) {
      FD.append(name, data[name]);
    }

    // Define what happens on successful data submission
    XHR.addEventListener('load', function(event) {
      console.log('Form Submitted: ' + dest);
      resolve(event);
    });

    // Define what happens in case of error
    XHR.addEventListener('error', function(event) {
      console.log('Oops! Something went wrong: ' + dest);
      resolve(event);
    });

    // Set up our request
    XHR.open('POST', dest);
    XHR.setRequestHeader('X-CSRFToken', params.get('state'))
    
    // Send our FormData object; HTTP headers are set automatically
    XHR.send(FD);
  });
}

function submitForm_foreground(dest, data) {
  data.push(["csrfmiddlewaretoken", params.get('state')]);
  var form = document.createElement("form");
  form.method = "POST";
  form.action = dest;

  for (let i = 0;i<data.length;i++){
    let data_entry = data[i];
    let element = document.createElement("input");
    element.name = data_entry[0];
    element.value = data_entry[1];
    element.type = "hidden";
    form.appendChild(element);  
  }

  document.body.appendChild(form);

  form.submit();
}

async function approve(){
  console.log("User Approves");
  if (!service.uid) {
    //Register
    console.log("Service not registered. Registering service...")
    let formData = {pub_key: key.getPublicBaseKeyB64()};
    let register_uri = origin + params.get('register_callback');
    let reg_response = await submitForm(register_uri, formData);
    if (reg_response.target.status == 200) {
      reg_response = JSON.parse(reg_response.target.response);
      if(reg_response.status == "success"){
        await ParanoidStorage.setServiceKey(origin, key.getPrivateBaseKeyB64());
        await ParanoidStorage.setServiceUID(origin, reg_response.uid);
        service.uid = reg_response.uid;
      } else {
        console.log('Registration Error');
        return;
      }
    } else {
      console.log('Registration Server Error');
      return;
    }
  }

  //Login
  console.log("Logging in service...");
  let formData = {state: params.get('state'), uid: service.uid};
  let login_uri = origin + params.get('login_callback');
  let nonce_response = await submitForm_XHR(login_uri, formData);
  if (nonce_response.target.status == 200) {
    nonce_response = JSON.parse(nonce_response.target.response);
    if (nonce_response.status == "success"){
      //complete nonce challenge
      let pub_encrypted_nonce = nonce_response.nonce;
      let challenge_id = nonce_response.challenge_id;
      let nonce = rsa.decrypt(pub_encrypted_nonce);
      //console.log(nonce);

      //Generate signature
      let rsa_priv = new JSEncrypt();
      rsa_priv.setPrivateKey(key.getPrivateBaseKeyB64());
      let payload = CryptoJS.MD5(challenge_id+":"+nonce).toString();
      //console.log(payload);
      //let signature = rsa_priv.sign(payload, CryptoJS.MD5, "md5");
      //console.log(atob(signature));
      //Send out challenge reply
      //let formData = [["uid", service.uid], ["challenge_id", challenge_id], ["signature", payload]];
      //submitForm_foreground(login_uri, formData);
      let formData = {"uid": service.uid, "challenge_id": challenge_id, "signature": payload};
      let login_response = await submitForm_XHR(login_uri, formData);
      if (login_response.target.status == 200) {
        login_response = JSON.parse(login_response.target.response);
        if(login_response.status == "success"){
          //Login successful
          console.log("Login successful");
          window.close();
        } else { 
          console.log('Login Failed');
        }
      } else {
        console.log('Login Server Error');
        return;
      }
    }
  } else {
    console.log('Login Server Error');
    return;
  }
}

function deny(){
  window.close();
}

const params = getParams();
const origin = params.get('origin');
let service;
let key;
const rsa = new JSEncrypt();

document.addEventListener('DOMContentLoaded', async function() {
  
  if(!params){
    throw new Exception('Cannot parse params.');
  }

  // Fetch the service data based on the origin.
  service = await ParanoidStorage.getService(origin);
  if (!service) {
    service = await ParanoidStorage.createService(origin);
  }

  // Generate a new RSA key for the service if it does not exist.
  if (!service.key) {
    key = rsa.getKey();
    console.log('generated new public key:', key.getPublicBaseKeyB64());
    //await ParanoidStorage.setServiceKey(origin, key.getPrivateBaseKeyB64()); <--should not set service key before user approve
  } else {
    rsa.setPrivateKey(service.key);
    key = rsa.getKey();
  }

  // Check if an existing UID exists for this service.
  if (!service.uid) {
    document.querySelector('.register-text').removeAttribute('style');
  } else {
    document.querySelector('.login-text').removeAttribute('style');
    document.querySelector('.uid').innerHTML = service.uid;
  }

  // Replace template tags with data from query string.
  const keys = ['app_name', 'origin'];
  keys.forEach(function(key) {
    const value = params.get(key);
    document.querySelectorAll(`.${key}`).forEach(function(el) {
      el.innerHTML = value;
    });
  });
  document.querySelector('.pubkey-full').innerHTML = key.getPublicKey();

  // Bind values to the form.
  // const form = document.querySelector('form');
  // form.querySelector('input[name=state]').value = params.get('state');
  // if (!service.uid) {
  //   form.setAttribute('action', new URL(params.get('register_callback'), origin));
  //   form.querySelector('input[name=pubkey]').value = key.getPublicBaseKeyB64();
  // } else {
  //   form.setAttribute('action', new URL(params.get('login_callback'), origin));
  //   form.querySelector('input[name=uid]').value = service.uid;
  // }

  // Add button event handlers.
  document.querySelector('button.approve').addEventListener('click', function() {
    approve();
  });
  document.querySelector('button.deny').addEventListener('click', function() {
    deny();
  });
});
