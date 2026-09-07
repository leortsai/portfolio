#!/usr/bin/env python3
"""
GitHub Portfolio 上傳腳本
執行方式: python3 upload_to_github.py
"""

import base64
import json
import os
import urllib.request
import urllib.error

# Token 改從環境變數讀取，不再寫死在檔案裡。
# 用法：GH_TOKEN=你的token python3 upload_to_github.py
TOKEN = os.environ.get("GH_TOKEN", "")
if not TOKEN:
    raise SystemExit(
        "找不到 GH_TOKEN。\n"
        "請先到 https://github.com/settings/tokens 產一組 classic token（只勾 repo），\n"
        "然後這樣執行：\n"
        "  GH_TOKEN=ghp_你的token python3 upload_to_github.py"
    )
REPO = "zia860316/portfolio"
BRANCH = "main"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

HEADERS = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "User-Agent": "portfolio-uploader"
}

# 要上傳的檔案清單（本地路徑 -> GitHub 路徑）
FILES = {
    "網站四頁截圖/獲獎作品截圖.jpg": "網站四頁截圖/獲獎作品截圖.jpg",
    "網站四頁截圖/聯絡我們截圖.png": "網站四頁截圖/聯絡我們截圖.png",
    "網站四頁截圖/首頁截圖.png": "網站四頁截圖/首頁截圖.png",
    "index.html": "index.html",
}


def api_request(url, method="GET", data=None):
    req = urllib.request.Request(url, headers=HEADERS, method=method)
    if data:
        req.data = json.dumps(data).encode("utf-8")
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read()), r.status


def get_file_sha(github_path):
    url = f"https://api.github.com/repos/{REPO}/contents/{urllib.parse.quote(github_path)}"
    try:
        data, _ = api_request(url)
        return data.get("sha")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def upload_file(local_path, github_path):
    full_path = os.path.join(BASE_DIR, local_path)
    if not os.path.exists(full_path):
        print(f"  ⚠️  找不到檔案: {local_path}")
        return False

    with open(full_path, "rb") as f:
        content = base64.b64encode(f.read()).decode()

    sha = get_file_sha(github_path)
    body = {
        "message": f"Update {github_path}",
        "content": content,
        "branch": BRANCH
    }
    if sha:
        body["sha"] = sha

    url = f"https://api.github.com/repos/{REPO}/contents/{urllib.parse.quote(github_path)}"
    try:
        _, status = api_request(url, method="PUT", data=body)
        action = "更新" if sha else "新增"
        print(f"  ✅ {action} {github_path} (HTTP {status})")
        return True
    except urllib.error.HTTPError as e:
        print(f"  ❌ 失敗 {github_path}: HTTP {e.code} - {e.read().decode()}")
        return False


import urllib.parse

print("🚀 開始上傳 portfolio 檔案到 GitHub...\n")
success, fail = 0, 0
for local, remote in FILES.items():
    size = os.path.getsize(os.path.join(BASE_DIR, local)) if os.path.exists(os.path.join(BASE_DIR, local)) else 0
    print(f"📤 上傳: {local} ({round(size/1024)}KB)")
    if upload_file(local, remote):
        success += 1
    else:
        fail += 1

print(f"\n✨ 完成！成功 {success} 個，失敗 {fail} 個")
print(f"🌐 查看網站: https://zia860316.github.io/portfolio/")
