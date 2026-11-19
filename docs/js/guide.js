// 나우다 회원 응대 안내 (홈 카드 + 상세 화면)
// 로그인한 업체가 공영관광지인지 아닌지에 따라 그 업체에 맞는 안내만 보여 준다.
// 공영관광지가 아닌 업체에는 '민영'이라는 말을 쓰지 않는다.
// A4 안내문 PDF는 docs/print/pdf/ 에 있다. 원본은 docs/print/guide.html (README 참고).
import { html, getSession } from './lib.js?v=202611200014';

const IMG = './img/guide/';

// 공영 여부: 서버가 업체 구분(type)을 보내 주면 그것을, 아니면 업체ID 앞글자(G=공영)를 본다.
export function isPublicPartner() {
  const p = getSession('p')?.partner || {};
  if (p.type) return String(p.type).includes('공영');
  return /^G/i.test(p.id || '');
}

// [단계, 설명, 누가, 공영 전용 단계인지, 그림, 주의 문구]
const GUIDE = {
  g: {
    label: '공영관광지',
    sub: 'Level 2 회원 전용',
    lead: html`공영관광지는 나우다 <b>Level 2</b>(누적 2,000포인트 이상) 회원만 이용할 수 있습니다. 관광증 확인 전에 등급부터 확인해 주세요.`,
    steps: [
      ['회원가입', '나우다 회원인지 확인합니다. 회원이 아니면 가입을 안내해 주세요.', '손님'],
      ['등급 확인', html`손님이 나우다에 로그인한 뒤 <b>관광증(마이페이지)</b>에서 등급을 보여 주면 확인합니다.`, '손님', true, 'step2_phone.png'],
      ['관광증 제시', 'Level 2 회원의 나우다 관광증 화면을 확인합니다.', '손님 → 직원'],
      ['혜택 적용', '우리 관광지의 나우다 혜택(입장료 감면)을 적용해 드립니다.', '직원'],
      ['QR 인증', html`혜택을 받은 Level 2 회원만 매표소 QR코드로 방문 인증합니다. 1회 인증하면 <b>200포인트</b>가 적립됩니다.`, '손님', false, 'step1_phone.png', 'Level 1 회원이거나 혜택이 적용되지 않았다면 QR 인증을 하지 않도록 안내해 주세요.'],
    ],
    qa: [
      ['Level 1 회원이 왔어요', '공영관광지는 Level 2 회원부터 이용할 수 있다고 안내해 주세요. 나우다 제휴사 방문 인증(1회 200포인트) 등으로 포인트를 모아 2,000점이 되면 자동으로 Level 2가 됩니다.'],
      ['손님이 자기 등급을 모른대요', '나우다에 로그인한 뒤 관광증을 열면 등급이 보입니다. 로그인하지 않으면 보이지 않습니다.'],
      ['아직 회원이 아닌 손님이에요', '고객용 안내문의 QR코드(visitjeju.net/nowda)로 가입할 수 있습니다. 내국인은 네이버 로그인, 외국인은 이메일로 가입합니다. 막 가입한 회원은 Level 1입니다.'],
    ],
    files: [
      ['staff-g', '직원용 안내문', '매표소 안쪽에 붙여 두는 응대 순서표', '나우다 회원 응대 안내_공영관광지_직원용.pdf'],
      ['customer-g', '고객용 안내문 (한국어·영어)', '매표소 앞에 붙여 두는 이용 조건·회원가입 QR 안내', '나우다 공영관광지 이용 안내_고객용.pdf'],
    ],
  },
  m: {
    label: '',
    sub: '나우다 회원 누구나',
    lead: '나우다 회원이 방문하면 아래 순서로 안내해 주세요.',
    steps: [
      ['회원가입', '나우다 회원인지 확인합니다. 회원이 아니면 가입을 안내해 주세요.', '손님'],
      ['관광증 제시', '손님이 보여 주는 나우다 관광증 화면을 확인합니다.', '손님 → 직원', false, 'step2_phone.png'],
      ['혜택 적용', '우리 업체에 등록된 나우다 혜택을 적용해 드립니다.', '직원'],
      ['QR 인증', '혜택을 받은 손님만 매장 QR코드로 방문 인증을 합니다.', '손님', false, 'step1_phone.png', '혜택이 적용되지 않았다면 QR 인증을 하지 않도록 안내해 주세요.'],
    ],
    qa: [],
    files: [
      ['staff-m', '직원용 안내문', '계산대·카운터 안쪽에 붙여 두는 응대 순서표', '나우다 회원 응대 안내_직원용.pdf'],
      ['customer-m', '고객용 안내문 (한국어·영어)', '계산대 앞에 붙여 두는 혜택 이용 방법·회원가입 QR 안내', '나우다 회원 혜택 안내_고객용.pdf'],
    ],
  },
};

const current = () => (isPublicPartner() ? 'g' : 'm');

/* ───────── 홈 카드 ───────── */
export function GuideCard() {
  const t = current(), d = GUIDE[t];
  return html`<section class="card gs">
    <div class="card-head">
      <h2>나우다 회원이 오면 이렇게 안내해 주세요 ${d.label && html`<span class=${'gs-type ' + t}>${d.label}</span>`}</h2>
      <a href="#/guide" class="more">자세히 보기 · 안내문 PDF →</a>
    </div>
    <ol class=${'gs-steps n' + d.steps.length}>${d.steps.map(([s, , , key]) => html`<li class=${key ? 'key' : ''}><span>${s}</span></li>`)}</ol>
    ${t === 'g' && html`<p class="gs-note">공영관광지는 <b>Level 2 회원(누적 2,000포인트 이상)만</b> 이용할 수 있습니다. 관광증 확인 전에 등급을 먼저 확인해 주세요.</p>`}
  </section>`;
}

/* ───────── 상세 화면 ───────── */
export function Guide() {
  const t = current(), d = GUIDE[t];
  return html`<div class="g-wrap">
    <div class="g-hero">
      <img class="conf" src=${IMG + 'intro_confetti_l.svg'} alt="" />
      <img class="wm" src=${IMG + 'nowda_logo_wordmark.svg'} alt="nowda" />
      <h1>나우다 회원 응대 안내</h1>
      <p>${d.lead}</p>
      <span class=${'chip ' + t}>${d.label ? d.label + ' · ' + d.sub : d.sub}</span>
      <div class="g-chars" aria-hidden="true">
        <img class="halla" src=${IMG + 'intro_halla_body.svg'} alt="" />
        <img class="dong" src=${IMG + 'intro_face_dongbaek.svg'} alt="" />
        <img class="hyeon" src=${IMG + 'intro_face_hyeonmu.svg'} alt="" />
      </div>
    </div>

    <ol class="g-flow">${d.steps.map(([s, desc, who, key, img, warn], i) => html`
      <li class=${'g-step' + (key ? ' key' : '')}><span class="g-num">${i + 1}</span>
        <div class="g-body">
          <div>
            <h3>${s} ${key && html`<span class="new">공영만</span>`} <span class="who">${who}</span></h3>
            <p>${desc}</p>
            ${key && html`<div class="g-lv">
              <div class="ok"><b>Level 2 → 이용 가능</b>누적 2,000포인트 이상. 다음 단계로 진행합니다.</div>
              <div class="no"><b>Level 1 → 이용 불가</b>공영관광지 혜택과 QR 인증 대상이 아닙니다.</div>
            </div>`}
            ${warn && html`<div class="g-warn">${warn}</div>`}
          </div>
          ${img && html`<img class="ph" src=${IMG + img} alt="" loading="lazy" />`}
        </div>
      </li>`)}
    </ol>

    <section class="g-sec">
      <h2>안내문 내려받기 (A4 PDF)</h2>
      <div class="g-dl">${d.files.map(([f, title, desc, name]) => html`
        <a class="g-file" href=${'./print/pdf/' + f + '.pdf'} download=${name}>
          <span class="pv"><img src=${'./print/pdf/' + f + '.png'} alt="" loading="lazy" /></span>
          <span><b>${title}</b><small>${desc}</small><span class="go">PDF 내려받기 ↓</span></span>
        </a>`)}</div>
      <p class="hint" style="margin-top:8px">A4 한 장으로 인쇄해 매장에 붙여 두고 써 주세요.</p>
    </section>

    ${d.qa.length > 0 && html`<section class="g-sec">
      <h2>이럴 땐 이렇게</h2>
      <div class="g-qa">${d.qa.map(([q, a]) => html`<div><b>${q}</b><span>${a}</span></div>`)}</div>
    </section>`}

    <p class="muted small" style="margin-top:18px">더 궁금한 점은 <a href="#/inquiries/new" class="g-link">1:1 문의</a>로 남겨 주세요.</p>
  </div>`;
}
