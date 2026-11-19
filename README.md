# 나우다 제휴사 안내 포털

나우다 제휴사에게 소식·FAQ·실적을 안내하고 1:1 문의를 받는 사이트입니다.

https://partner.nowda.kr/

## 회원 응대 안내 A4 PDF

`회원 응대` 화면(`#/guide`)에서 내려받는 안내문은 `docs/print/pdf/`에 있습니다.
문구를 고치려면 원본 `docs/print/guide.html`을 고친 뒤, 사이트를 로컬에서 띄우고(`python3 -m http.server 8765 -d docs`) 크롬으로 다시 뽑습니다.

```bash
for d in staff-g staff-m customer-g; do
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer --virtual-time-budget=6000 \
    --print-to-pdf="docs/print/pdf/$d.pdf" "http://localhost:8765/print/guide.html?doc=$d"
  sips -s format png -Z 420 "docs/print/pdf/$d.pdf" --out "docs/print/pdf/$d.png"
done
```

- `staff-g` 직원용·공영관광지, `staff-m` 직원용·민영 제휴사, `customer-g` 고객용·공영관광지(한국어·영어)
- 공영·민영 구분은 업체ID 앞글자(G=공영)로 합니다. 서버가 업체 구분(`type`)을 보내 주면 그것을 먼저 씁니다.
- 그림(`docs/img/guide/`)은 비짓제주 나우다 이용안내 페이지의 공사 제작 이미지입니다.
