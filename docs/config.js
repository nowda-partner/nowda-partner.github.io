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
};
