#!/usr/bin/env python3
"""
Simple HTTP server to serve the GitLab Time Dashboard
Usage: python3 serve.py
"""

import http.server
import socketserver
import os

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Redirect root to the dashboard
        if self.path == '/':
            self.send_response(301)
            self.send_header('Location', '/gitlab-time-dashboard.html')
            self.end_headers()
            return
        return super().do_GET()
    
    def end_headers(self):
        # Allow loading .env file
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"🚀 GitLab Time Dashboard server running at:")
        print(f"   http://localhost:{PORT}/gitlab-time-dashboard.html")
        print(f"\nPress Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n✋ Server stopped")

if __name__ == "__main__":
    main()
