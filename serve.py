import http.server, socketserver, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    # HTTP/1.0 每張圖都要重開一條連線，單執行緒時影片的 range request
    # 會把連線佔住，後面的圖片全部卡住不載入。
    protocol_version = "HTTP/1.1"
    def log_message(self, format, *args): pass
    def end_headers(self):
        # 本機預覽：關掉快取，改完存檔重新整理就看得到
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        http.server.SimpleHTTPRequestHandler.end_headers(self)

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

with Server(("", 3456), Handler) as httpd:
    httpd.serve_forever()
