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
  --port INTEGER    Port to start the server on. Defaults to 5000.
  --base-path TEXT  Base path to look up Paranoid files. Defaults to
                    "paranoid", which means that files will be located in
                    /keybase/private/<username>/paranoid.
  --disable-auth    Disables authentication for development. This is insecure
                    and opens up secrets to be leaked via CSRF!
  --disable-chat    Disables sending of Keybase chat messages. This might be
                    useful during development.
  --help            Show this message and exit.
```

## TLS Setup

TODO
