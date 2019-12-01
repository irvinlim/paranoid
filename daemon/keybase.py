import json
import os
import subprocess
from functools import lru_cache


class KeybaseException(Exception):
    pass


class KeybaseNotFoundException(KeybaseException):
    def __init__(self):
        super().__init__('Could not locate `keybase` executable. Please make sure it is installed and on your $PATH.')


class KeybaseCliException(KeybaseException):
    def __init__(self, args, returncode, stdout, stderr):
        super().__init__('"keybase {}" exited with return code {}: {}'.format(args, returncode, stderr))
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


class KeybaseFileNotFoundException(KeybaseException):
    def __init__(self, path):
        super().__init__('file does not exist: {}'.format(path))


class KeybaseClient:
    def init(self, base_path='paranoid'):
        self.base_path = base_path

    @lru_cache()
    def get_username(self):
        "Returns the username of the currently logged in keybase user."
        try:
            res = self._run_cmd(['id', '--json'])
        except KeybaseCliException as e:
            raise KeybaseException('Please login to keybase first using `keybase login`.')

        user = json.loads(res)
        return user.get('username')

    def get_private(self, path):
        return os.path.join('/keybase/private', self.get_username(), self.base_path, path)

    def get_public(self, path):
        return os.path.join('/keybase/public', self.get_username(), self.base_path, path)

    def ensure_dir(self, path):
        "Makes sure that the given path exists as a directory."
        if self.exists(path):
            return False

        self.mkdir(path)
        return True

    def ensure_file(self, path, default=''):
        "Makes sure that the given path exists as a file, otherwise writes the default data to the file."
        if self.exists(path):
            return False

        self.put_file(path, default)
        return True

    def exists(self, path):
        "Returns True if the specified path exists."
        try:
            self.stat(path)
            return True
        except KeybaseFileNotFoundException as e:
            return False

    def get_file(self, path):
        "Uses the Keybase command-line API to fetch a file."
        try:
            return self._run_cmd(['fs', 'read', path])
        except KeybaseCliException as e:
            if 'file does not exist' in e.stderr:
                raise KeybaseFileNotFoundException(path)
            raise e

    def put_file(self, path, data):
        "Uses the Keybase command-line API to write to a file."
        self._run_cmd(['fs', 'write', path], data)

    def mkdir(self, path):
        "Creates a new directory."
        self._run_cmd(['fs', 'mkdir', path])

    def stat(self, path):
        "Stats a dirent."
        try:
            self._run_cmd(['fs', 'stat', path])
        except KeybaseCliException as e:
            if 'file does not exist' in e.stderr:
                raise KeybaseFileNotFoundException(path)
            raise e

    def list_dir(self, path):
        "Uses the Keybase command-line API to list a directory's contents."
        try:
            res = self._run_cmd(['fs', 'ls', path, '-1', '--nocolor']).strip()
            if not res:
                return []
            return res.split('\n')
        except KeybaseCliException as e:
            if 'file does not exist' in e.stderr:
                raise KeybaseFileNotFoundException(path)
            raise e

    def _run_cmd(self, args, inp=None):
        try:
            p = subprocess.Popen(
                ['keybase'] + args,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE,
                text=True,
            )
        except FileNotFoundError:
            raise KeybaseNotFoundException()

        stdout, stderr = p.communicate(inp)
        if p.returncode:
            raise KeybaseCliException(args, p.returncode, stdout, stderr)

        return stdout
