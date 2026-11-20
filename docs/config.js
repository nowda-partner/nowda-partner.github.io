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

  // 나우다 인스타그램 계정 (홈 오른쪽 인스타그램 카드 머리). 보여 줄 게시물은 관리자 화면 [인스타그램]에서 고릅니다.
  INSTAGRAM: { handle: '@_nowda_', url: 'https://www.instagram.com/_nowda_' },

  // 홈 '나우다가 함께합니다' 문구. **굵게** 쓸 부분은 별표 두 개로 감쌉니다. 숫자는 직접 고쳐 주세요.
  ABOUT: [
    ['👥', '나우다 회원 **37만 명**이 제주 여행 중 제휴사를 찾고 있습니다.'],
    ['📍', '제주 곳곳 **295곳** 제휴사가 함께하고 있습니다.'],
    ['📣', 'SNS와 국내외 오프라인 안내 채널로 제휴사를 꾸준히 알립니다.'],
  ],
};
