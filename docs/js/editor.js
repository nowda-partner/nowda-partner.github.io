// 노션 스타일 블록 편집기(Editor.js). 관리자 화면에서만 불러온다.
import { api, compressImage } from './lib.js?v=202611192358';

const CDN = 'https://cdn.jsdelivr.net/npm/';
const load = (p) => import(CDN + p).then((m) => m.default);

let libs = null;
async function loadLibs() {
  libs ||= Promise.all([
    load('@editorjs/editorjs@2.31.7/dist/editorjs.mjs'),
    load('@editorjs/header@2.8.9/dist/header.mjs'),
    load('@editorjs/list@2.0.9/dist/editorjs-list.mjs'),
    load('@editorjs/image@2.10.3/dist/image.mjs'),
    load('@editorjs/embed@2.8.0/dist/embed.mjs'),
    load('@editorjs/quote@2.7.6/dist/quote.mjs'),
    load('@editorjs/delimiter@1.4.2/dist/delimiter.mjs'),
    load('@editorjs/table@2.4.6/dist/table.mjs'),
    load('@editorjs/marker@1.4.0/dist/marker.mjs'),
    load('@editorjs/underline@1.2.1/dist/underline.mjs'),
  ]);
  return libs;
}

async function uploadFile(file) {
  const img = await compressImage(file);
  const r = await api('a', 'uploadImage', img);
  return { success: 1, file: { url: r.url, id: r.id } };
}

const KO = {
  messages: {
    ui: {
      blockTunes: { toggler: { 'Click to tune': '설정', 'or drag to move': '또는 끌어서 이동' } },
      inlineToolbar: { converter: { 'Convert to': '바꾸기' } },
      toolbar: { toolbox: { Add: '블록 추가' } },
      popover: { Filter: '검색', 'Nothing found': '없음', 'Convert to': '바꾸기' },
    },
    toolNames: {
      Text: '본문', Heading: '제목', 'Unordered List': '글머리 목록', 'Ordered List': '번호 목록', Checklist: '체크리스트',
      List: '목록', Image: '이미지', Quote: '인용', Delimiter: '구분선', Table: '표', Link: '링크', Marker: '형광펜',
      Bold: '굵게', Italic: '기울임', Underline: '밑줄', 'Inline Code': '코드',
    },
    tools: {
      link: { 'Add a link': '링크 주소 입력' },
      stub: { 'The block can not be displayed correctly.': '이 블록은 표시할 수 없습니다.' },
      image: { Caption: '설명', 'Select an Image': '이미지 선택', 'With border': '테두리', 'Stretch image': '넓게', 'With background': '배경' },
      header: { 'Heading 1': '제목 1', 'Heading 2': '제목 2', 'Heading 3': '제목 3', 'Heading 4': '제목 4' },
      list: { Unordered: '글머리', Ordered: '번호', Checklist: '체크리스트', 'Start with': '시작 번호', 'Counter type': '번호 형식' },
      table: { 'With headings': '머리글 행', 'Without headings': '머리글 없음', 'Add row above': '위에 행 추가', 'Add row below': '아래에 행 추가', 'Delete row': '행 삭제', 'Add column to left': '왼쪽에 열 추가', 'Add column to right': '오른쪽에 열 추가', 'Delete column': '열 삭제' },
      quote: { 'Align Left': '왼쪽 정렬', 'Align Center': '가운데 정렬' },
    },
    blockTunes: {
      delete: { Delete: '삭제', 'Click to delete': '한 번 더 눌러 삭제' },
      moveUp: { 'Move up': '위로' },
      moveDown: { 'Move down': '아래로' },
    },
  },
};

/** holder 요소에 편집기를 띄운다. 돌려받은 객체의 save()로 본문 JSON을 얻는다. */
export async function createEditor(holder, data) {
  const [EditorJS, Header, List, ImageTool, Embed, Quote, Delimiter, Table, Marker, Underline] = await loadLibs();
  const editor = new EditorJS({
    holder,
    data: data && data.blocks ? data : { blocks: [] },
    placeholder: "내용을 입력하세요. '/' 또는 + 버튼으로 제목·목록·이미지·표를 넣을 수 있습니다.",
    i18n: KO,
    autofocus: false,
    tools: {
      header: { class: Header, inlineToolbar: true, config: { levels: [2, 3, 4], defaultLevel: 2, placeholder: '제목' } },
      list: { class: List, inlineToolbar: true, config: { defaultStyle: 'unordered' } },
      image: {
        class: ImageTool,
        config: {
          captionPlaceholder: '이미지 설명 (선택)',
          buttonContent: '이미지 선택 또는 끌어다 놓기',
          uploader: {
            uploadByFile: uploadFile,
            uploadByUrl: async (url) => ({ success: 1, file: { url } }),
          },
        },
      },
      embed: { class: Embed, inlineToolbar: true, config: { services: { youtube: true, vimeo: true } } },
      quote: { class: Quote, inlineToolbar: true, config: { quotePlaceholder: '인용문', captionPlaceholder: '출처' } },
      delimiter: Delimiter,
      table: { class: Table, inlineToolbar: true, config: { rows: 2, cols: 3, withHeadings: true } },
      marker: { class: Marker, shortcut: 'CMD+SHIFT+M' },
      underline: Underline,
    },
  });
  await editor.isReady;
  return editor;
}
