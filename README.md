# _Paranoid_: Privacy through Granular Separation of Identities

This is a project submission for CSCI 2390 Privacy-conscious Computer Systems.

## Components

- Browser (Chromium) extension: `/extension`
- Python helper daemon: `/daemon`
- Sample application: `/sample-app`

## Instructions

### Chromium Extension

1. Go to `chrome://extensions` and enable "Developer Mode".
2. Click "Load unpacked" and select the `extensions/` directory.
3. Make sure to follow the instructions on the welcome page.
   - If protocol handler is not registered, go to `chrome://settings/handlers` to make sure the domain is not blocked.

### Daemon

1. Set up virtualenv, install requirements
2. Start server:

   ```sh
   python daemon.py
   ```

### Sample App

See [`sample-app/README.md`](`sample-app/README.md`).

## TODO

### TODO for Chromium Extension

- [x] Create app shell for the extension
- [x] Complete registration flow
- [x] Complete login flow
- [x] Unmasking of placeholders
- [ ] Implement filesystem-backed storage
- [ ] Implement permission granting between end-users
