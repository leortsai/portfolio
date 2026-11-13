import http.server, socketserver, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args): pass
    def end_headers(self):
        # 本機預覽：關掉快取，改完存檔重新整理就看得到
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        http.server.SimpleHTTPRequestHandler.end_headers(self)

socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", 3456), Handler) as httpd:
    httpd.serve_forever()
