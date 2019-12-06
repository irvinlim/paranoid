# Paranoid Daemon

Daemon server that interfaces directly with Keybase/KBFS, and communicates with the Chromium extension by HTTP.

Built to be cross-platform, tested on both macOS and Windows.

## Instructions

1. Set up virtualenv, install requirements
2. Start server:

   ```sh
   python main.py
   ```

## Usage

```
Usage: main.py [OPTIONS]

Options:
  --port INTEGER      Port to start the server on. Defaults to 5000.
  --ssl-cert TEXT     Path to SSL certificate.
  --ssl-privkey TEXT  Path to SSL private key.
  --base-path TEXT    Base path to look up Paranoid files. Defaults to
                      "paranoid", which means that files will be located in
                      /keybase/private/<username>/paranoid.
  --disable-auth      Disables authentication for development. This is
                      insecure and opens up secrets to be leaked via CSRF!
  --disable-chat      Disables sending of Keybase chat messages. This might be
                      useful during development.
  --help              Show this message and exit.
```

## TLS Setup

The following instructions assume that you have OpenSSL installed.

More information: <https://www.freecodecamp.org/news/how-to-get-https-working-on-your-local-development-environment-in-5-minutes-7af615770eec/>

1. Generate a new root CA private key:

   ```sh
   openssl genrsa -des3 -out cert/rootCA.key 4096
   ```

2. Generate and sign the root CA certificate with your private key:

   ```sh
   openssl req -x509 -new -nodes -key cert/rootCA.key -sha256 -days 30 -out cert/rootCA.pem
   ```

3. Add the root CA certificate to your keychain.

4. Create a new certificate key for our daemon server:

   ```sh
   openssl genrsa -out cert/daemon.key 4096
   ```

5. Create a new certificate signing request (CSR), using the configuration file provided. The CN is assumed to be
   `daemon.paranoid.local`.

   ```sh
   openssl req -new -key cert/daemon.key -out cert/daemon.csr -config csr/daemon.csr.cnf
   ```

6. Use the root CA certificate to sign the resultant certificate to be used by the daemon server, using the X.509 v3
   extension configuration:

   ```sh
   openssl x509 -req -in cert/daemon.csr -CA cert/rootCA.pem -CAkey cert/rootCA.key -CAcreateserial -out cert/daemon.pem -days 30 -sha256 -extfile csr/v3.ext
   ```

Now you have a self-signed certificate at `cert/daemon.pem`, signed for the domain `daemon.paranoid.local`.

To serve the certificate, run the daemon with the `--ssl-cert` and `--ssl-privkey` flags pointing to `cert/daemon.pem`
and `cert/daemon.key` respectively.

Additionally, resolve `daemon.paranoid.local` to `127.0.0.1` by adding the following line to `/etc/hosts`:

```
127.0.0.1 daemon.paranoid.local
```
