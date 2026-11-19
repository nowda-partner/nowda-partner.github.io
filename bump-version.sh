#!/bin/sh
# 사이트를 고친 뒤 올리기 전에 실행: 화면 파일 주소 뒤의 ?v=버전 을 새 값으로 바꾼다.
# 브라우저가 예전 파일을 계속 쓰지 않고 새 파일을 받게 하기 위함.
cd "$(dirname "$0")/docs" || exit 1
V=$(date +%Y%m%d%H%M)
python3 - "$V" <<'PY'
import re, sys, glob
v = sys.argv[1]
pat = re.compile(r"""(['"])(\.\.?/[\w./-]+\.(?:js|css))(?:\?v=[\w-]+)?(['"])""")
for p in ['index.html'] + glob.glob('js/*.js'):
    s = open(p, encoding='utf-8').read()
    n = pat.sub(lambda m: f"{m[1]}{m[2]}?v={v}{m[3]}", s)
    if n != s:
        open(p, 'w', encoding='utf-8').write(n)
print('version', v)
PY
