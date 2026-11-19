// 사이트 설정 — 이 파일만 고치면 됩니다.
export const CONFIG = {
  // 앱스 스크립트 웹앱 주소(배포 후 받은 /exec 주소).
  // 비워 두면 "체험 모드"로 동작합니다(브라우저 안에서만 저장되는 예시 데이터).
  API_URL: 'https://script.google.com/macros/s/AKfycbwMqnavhMiu5CrGRkN0lxc2k4JkpVtiGDaK4q708Xaqvc5gtYWTJ69ozRNrtUE3yVsu/exec',

  SITE_NAME: '나우다 제휴사 안내',
  SITE_SHORT: '나우다 제휴사',

  // 소식 분류
  NOTICE_CATEGORIES: ['일반', '시스템', '정산', '이벤트', '운영'],

  // 1:1 문의 유형
  INQUIRY_TYPES: ['정보 수정 요청', '시스템 문의', '정산 문의', '의견·제안', '기타'],

  // FAQ 분류
  FAQ_CATEGORIES: ['이용 방법', '정산', 'QR·인증', '기타'],

  // 새 글 표시 기간(일)
  NEW_DAYS: 3,

  // 담당 연락처(화면 아래쪽에 표시, 비워 두면 숨김)
  CONTACT: '나우다 운영팀',

  // 나우다 이벤트 페이지. 홈 '진행 중인 나우다 이벤트' 목록은 서버가 이 페이지를 한 시간마다 읽어 옵니다.
  EVENT_PAGE: 'https://www.visitjeju.net/kr/nowda/event',

  // 나우다 SNS (홈 오른쪽 '나우다가 함께합니다' 카드 아래). 채널이 늘면 줄을 추가하세요.
  SNS: [
    { name: '인스타그램', handle: '@_nowda_', url: 'https://www.instagram.com/_nowda_', icon: 'IG', color: 'linear-gradient(45deg,#f9a825,#e1306c,#833ab4)' },
  ],

  // 홈 '나우다가 함께합니다' 문구. **굵게** 쓸 부분은 별표 두 개로 감쌉니다. 숫자는 직접 고쳐 주세요.
  ABOUT: [
    ['👥', '나우다 회원 **35만 명**이 제주 여행 중 제휴처를 찾고 있습니다.'],
    ['📍', '제주 곳곳 **300여 곳** 제휴처가 함께하고 있습니다.'],
    ['📣', '앱·SNS·관광 안내 채널로 제휴처를 꾸준히 알립니다.'],
  ],
};
