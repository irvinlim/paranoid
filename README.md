# 👻 _Paranoid_: Privacy through Granular Separation of Identities

This is a project submission for CSCI 2390 Privacy-Conscious Computer Systems.

## Introduction

Paranoid aims to allow users to regain control of their personal data. We explore a new paradigm of
designing web services to present personal data on HTML webpages without having access to the data
itself, with the assumption that the web service is untrusted. Paranoid achieves this by storing all
personal data separately outside of the service, only substituting the private data on the client
side via DOM manipulation using a browser extension, as well as a secure platform to share private
data files with other users built on top of Keybase. We also show that such an approach is secure
against various attack vectors, in the case of both malicious services and users.

See [`report/report.pdf`](report/report.pdf) for the full final report.

## Instructions

In order to use Paranoid, both the browser extension and the daemon server must be loaded and
running.

### Chromium Extension

1. Go to `chrome://extensions` and enable "Developer Mode".
2. Click "Load unpacked" and select the `extensions/` directory.
3. Make sure to follow the instructions on the welcome page.
   - If protocol handler is not registered, go to `chrome://settings/handlers` to make sure the
     domain is not blocked.

### Daemon

See [`daemon/README.md`](daemon/README.md).

### Sample App

See [`sample-app/README.md`](sample-app/README.md).
