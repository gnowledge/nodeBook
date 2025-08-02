
import fcntl
import os
from contextlib import contextmanager

@contextmanager
def file_lock(lock_file_path):
    lock_file = open(lock_file_path, 'w')
    try:
        fcntl.flock(lock_file, fcntl.LOCK_EX)
        yield
    finally:
        fcntl.flock(lock_file, fcntl.LOCK_UN)
        lock_file.close()
