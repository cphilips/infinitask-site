"""Static preview server.

Deliberately not `python3 -m http.server`: that module evaluates
`default=os.getcwd()` at import time, which raises EPERM when the launcher
starts it with a working directory it cannot stat. This pins the root to the
repo instead, derived from this file's own location.
"""
import http.server
import os
import socketserver
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write('%s %s\n' % (self.address_string(), fmt % args))


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', PORT), Handler) as httpd:
    sys.stderr.write('serving %s on http://127.0.0.1:%d\n' % (ROOT, PORT))
    httpd.serve_forever()
