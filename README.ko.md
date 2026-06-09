English: [README.md](./README.md)

# API Inspector

페이지가 호출하는 API를 DevTools 패널에서 자동 수집하고, 필터링·민감정보 마스킹 후 cURL / HTTPie로 변환·복사하는 Chromium 확장프로그램.

> DevTools Network 탭의 "Copy as cURL"을 정리·필터·변환·보안 마스킹으로 강화한 도구.

## 사용처

웹 페이지가 백그라운드에서 주고받는 API 요청(XHR/fetch)을 개발자가 빠르게 들여다보고, 정리하고, 남에게 전달하기 위한 도구. 브라우저 기본 DevTools의 Network 탭은 요청을 보여주긴 하지만 검색·정리·변환·공유·문서화가 약함. 이 확장은 그 빈틈을 메움.

대표 사용 흐름:

1. QA 도중 버그를 발견 → F12에서 API Inspector 탭 열기
2. 페이지에서 버그를 재현하면 발생한 API 요청이 자동으로 수집·정리됨
3. 문제의 요청을 우클릭 → "Copy as cURL" (인증 토큰은 자동 마스킹)
4. 백엔드 개발자에게 그대로 전달 → 서버에서 동일 요청 재현

이런 사람에게 유용함:

- 백엔드 / 풀스택 개발자 — API 디버깅, 요청 재현, cURL/Postman 변환
- QA 엔지니어 — 버그 재현에 필요한 정확한 요청을 캡처해 공유
- 프론트엔드 개발자 — 페이지가 실제로 어떤 API를 호출하는지 빠르게 파악
- API를 다루는 누구나 — 토큰 노출 없이(자동 마스킹) 안전하게 요청을 공유

핵심 차별점은 (1) 토큰 자동 마스킹으로 안전한 공유, (2) 정규식·본문 전문 검색, (3) cURL/HTTPie/Postman 변환과 엔드포인트 문서 자동 생성, (4) HAR import로 남이 보낸 트래픽도 같은 화면에서 분석, (5) 네트워크 가로채기 권한 없이 DevTools API만 사용하는 최소권한 설계.

## 예시: 실패한 요청을 백엔드 개발자에게 넘기기

프론트에서 403이 떴고, 백엔드 개발자에게 재현을 요청해야 하는 상황.

1. F12 → API Inspector에서 요청 재현
2. 요청 선택 → Convert 탭. `mask` 켜고 `$ placeholder` 켜기
3. 출력을 복사해 슬랙/티켓에 붙임:

```bash
curl 'https://api.company.com/orders/123' \
  -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-raw '{"qty":2}'
```

진짜 토큰이 들어있지 않아 유출이 없음. 받는 사람은 자기 자격증명만 채워 그대로 실행:

```bash
export AUTH_TOKEN="자기-토큰"
# 위 curl 붙여넣기
```

모드 선택:

- 혼자 디버깅 (원본 값 필요) — mask off
- 받는 사람이 실행도 해야 함 — mask on + placeholder on
- 구조만 공유 (실행 X) — mask on, placeholder off (`***MASKED***`)
- Postman 협업 (팀이 토큰을 변수로 관리) — placeholder on → `{{AUTH_TOKEN}}`

## 특징

- DevTools 패널 — F12 안에 "API Inspector" 탭으로 통합
- 필터 — 정규식(URL) · 메서드 · 상태코드 · 정적자원 숨김 · 본문 전문 검색
- 자동 마스킹 — `Authorization` / `Cookie` / `*-token` / 쿼리 토큰을 변환·표시 시 가림
- 변환 — cURL(멀티라인, multipart/form 지원) · HTTPie · Postman Collection. 플레이스홀더 모드를 켜면 자격증명을 `$AUTH_TOKEN` / `{{AUTH_TOKEN}}` 변수 자리로 출력 → 진짜 토큰 노출 없이도 받는 사람이 자기 값만 채우면 바로 실행 가능.
- 편집 & 재전송 — DevTools 패널에서 캡처한 요청을 편집(메서드/URL/헤더/바디)하고 `{{변수}}` 치환 후, 보고 있는 페이지의 세션으로 그대로 재전송(추가 권한·CORS 문제 없음). 응답을 원본과 비교
- 변수 — `{{KEY}}` 값을 한 번 정의해두고 재전송 시 재사용
- 툴박스 — 인코더/디코더(Base64 / URL / Hex / JWT) · 해시(MD5 / SHA-1 / SHA-256) · 캡처된 모든 응답 본문에서 정규식 스캔(예: `flag{...}` 찾기)
- 응답 검색 — 응답 본문 정규식 하이라이트
- 퍼즈 — Intruder 방식: `§...§`로 위치 지정 + 페이로드 리스트를 페이지 세션으로 순차 재전송, 결과 표에서 길이/상태 이상치 강조 (인가된 워게임/CTF 전용)
- diff — 두 요청 비교(status / query / 헤더 / 본문)
- export / import 양방향 — export: Postman Collection / HAR / 세션 JSON(재import 가능) / 마크다운 문서. import: HAR · Postman Collection · 세션 JSON을 자동 인식해서 불러오고 응답 본문까지 인라인 복원 (마크다운은 export 전용)
- 독립 뷰어 — 툴바 아이콘을 누르면 새 탭에 뷰어가 열림. DevTools 없이 HAR/세션 파일을 import해서 분석 가능 (실시간 캡처는 DevTools 패널 담당)
- 엔드포인트 문서화 — 마크다운 문서 자동 생성
- JSON 트리뷰 — 요청/응답 본문을 접이식 트리로
- 최소권한 — `storage` 외 권한 없음. `webRequest` / host 권한 불필요 (네트워크 가로채기 없이 DevTools API만 사용)

## 보안과 개인정보

마스킹 기능의 핵심 목적은 안전한 공유임. DevTools의 "Copy as cURL"은 `Authorization: Bearer ...` 토큰을 그대로 복사함 — 그걸 슬랙에 붙이는 순간 자격증명이 유출됨. API Inspector는 바로 그걸 막기 위해 만들어졌음.

- 완전 로컬 — 어떤 데이터도 브라우저를 벗어나지 않음. 서버·분석·외부 요청 없음.
- 자동 자격증명 마스킹 — `Authorization` / `Cookie` / `*-token` 헤더와 `token` / `key` / `password` 쿼리 파라미터를 화면과 모든 export(cURL / HTTPie / Postman)에서 가림.
- 본문 민감정보 마스킹 — 요청/응답 본문, 헤더, 쿼리 값에서 신용카드 번호(Luhn 검증, 끝 4자리만 유지), 이메일, JWT, Bearer 토큰, 주민등록번호를 탐지해 가림. PII 노출 없이 요청·응답을 공유할 수 있음.
- 최소권한 — `storage` 권한만 사용. `webRequest`·host 권한·content script 없음. 네트워크를 가로채지 않고 공식 DevTools API로만 트래픽을 읽음.
- 검증 가능 — 마스킹·변환 로직은 단위 테스트로 커버된 순수 함수라, 무엇이 가려지는지 확인 가능함.

## 기술 스택

Vite 6 · CRXJS 2 · React 19 · TypeScript(strict) · Tailwind 4 · Zustand · @tanstack/react-virtual · Vitest

핵심 로직(`src/core/`)은 브라우저 API에 의존하지 않는 순수 함수로 분리해 단위 테스트로 검증함. UI는 `chrome.devtools`를 목으로 두고 jsdom 위에서 컴포넌트 테스트(@testing-library/react)로 검증함.

## 테스트

- 단위 테스트 — `src/core/`의 normalize / mask / filter / convert / diff / har / postman / markdown 순수 함수
- 컴포넌트 테스트 — `chrome.devtools.network` 이벤트를 모의 발생시켜 패널이 요청을 수집·필터·마스킹·변환·복사하고 응답 본문을 lazy load 하는지 검증 (`tests/components/`)

```bash
npm test
```

## 개발

```bash
npm install
npm run dev      # HMR 개발 빌드 (dist/ 감시)
npm run build    # 타입체크 + 프로덕션 빌드
npm test         # Vitest
```

## 브라우저에 로드

1. `npm run dev` 또는 `npm run build` 실행
2. `chrome://extensions` → 개발자 모드 ON
3. 압축해제된 확장 프로그램 로드 → `dist` 폴더 선택
4. 아무 페이지에서 F12 → API Inspector 탭
5. 페이지를 새로고침하면 이후 요청이 수집됨 (DevTools가 열린 동안의 요청만 캡처됨)

## 구조

```
src/
├─ devtools/      DevTools 패널 등록
├─ panel/         React 패널 UI (FilterBar / RequestList / DetailPanel / ...)
│  ├─ store/      Zustand 상태
│  └─ hooks/      네트워크 캡처 · 응답 본문 lazy load
├─ core/          순수 로직 (테스트 대상)
│  ├─ normalize   HAR → CapturedRequest
│  ├─ mask        민감 헤더/쿼리 마스킹
│  ├─ filter      필터 엔진
│  └─ convert/    cURL · HTTPie 변환
└─ types.ts
```
