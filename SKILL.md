---
name: image-prompt
version: "4.0.0+local.2"
description: 이미지 프롬프트 작성·검토·완성 원문 전달·참조 기반/부분 편집을 지원하며, 막연한 요청을 gpt-image-2(Codex `$imagegen`) 완성 프롬프트로 컴파일. 커버 — 카테고리 C1~C12·화보 Format B·홍보물 P1~P12·타이포 포스터 TP1~TP17·룩 L1~L9·컨셉 축 M/R/X/T·jsonl·검증기. 트리거 — "공냥 프롬프트", "이미지 프롬프트 써줘", "화보 프롬프트", "키아트", "홍보물/판촉물", "표지/앨범커버/북커버", "활자 견본/워드마크", "포스터/카드뉴스/만화", "슬라이드/피피티 이미지", "글자 배치", "프롬프트 jsonl", "컨셉부터 잡아줘", "시안 여러 개". ※ 생성·양산은 [codex-imagegen].
---

# 🐾 공냥 프롬프트 킷 VOL.2 — gpt-image-2 프롬프트 컴파일러

모호한 요청을 `$imagegen`용 완성 한국어 프로덕션 프롬프트로 컴파일한다. 생성·양산은 [codex-imagegen](1장은 codex 직접).

이 후보의 문서 버전은 업스트림 `4.0.0`에 대한 `4.0.0+local.2` 보강이다. 아래 보강은 작성·검사 기준을 정리하며, 생성 실행 경로·인증·설정·배치 실행기를 교체하지 않는다.

## 워크플로우

1. 요청을 `create`(새로 작성), `verbatim`(받은 완성 원문 그대로 전달), `edit`(요청 범위의 부분 수정) 중 하나로 분류한다. 프롬프트 작성 허가는 생성 허가가 아니다. 명시적인 생성 요청은 상위 지침이 허용하는 범위에서 생성 권한이 될 수 있으며, 이미 승인한 동일 범위에 추가 재승인 루프를 요구하지 않는다.
2. `create`에서 빠진 결정(카테고리·컷타입·피사체·스타일·구도·텍스트·AR)은 기존 공냥 흐름대로 추론해 채운다. 확인이 필요한 한글 문구 원문·브랜드명·민감 소재와 미지정 참조 범위만 묻는다. `create`·`edit`에서 참조 이미지가 있으면 카테고리 라우팅과 별개로 먼저 실제 이미지를 확인하고, 참고할 느낌·속성이 불명확할 때는 `references/reference-images.md`의 질문 절차로 범위를 정한 뒤 그 참조를 반영한다. `verbatim`은 원문을 바꾸지 않고, `edit`은 요청된 변경과 필요한 보존만 적는다.
   `create`·`edit`의 출력 언어는 현재 요청과 상위 지침을 따른다. 한국어 예제는 모든 환경의 출력 언어를 고정하지 않는다. 검사만 요청받았으면 본문을 바꾸지 않으며, 사용자가 명시한 검증용 intent·format을 우선한다. 원문 보존 요청이 명시된 `create` 검사 문맥을 자동으로 `verbatim`으로 바꾸지는 않는다.
3. `create`에서만 기존 라우팅 표의 C/P/TP·화보·룩 선택과 포맷 A/B를 결정한다. `verbatim`은 패턴·포맷을 선택하거나 참조를 로드하지 않고 입력 원문을 그대로 전달하며, `edit`은 요청된 변경에 필요한 참조만 확인한다.
4. 새 장면 작성일 때만 해당 철칙과 포맷 골격을 적용한다. 선화·플랫 벡터·단색 등 요청 매체가 사진적 요건을 쓰지 않으면 철칙 #5/#7의 사진 조건을 추가하지 않는다.
5. 고가치 산출물은 응답 전 `node scripts/check_prompt.mjs`로 검증한다. 기존 호출은 인자 없이 기존 동작을 유지하고, 새 `intent`·`format`·`medium-limits` 문맥은 검사기 호출에만 둔다.
6. 상위 지침이 허용하는 명시적인 생성 요청 또는 이미 승인된 동일 범위의 생성 권한이 있을 때만 컴파일된 프롬프트를 현재 승인된 native/imagegen 또는 [codex-imagegen] 경로의 현행 계약에 맞춰 전달한다. 생성 경로·승인 훅·실행기를 이 스킬에서 새로 만들지 않는다.

확장 예: 포스터→C3·화보→C1 B·키아트→C11·아이콘→C9("텍스트 없음")·제품→C4·만화→C10·피피티→C12(16:9).

출력 계약: `create` 단일=본문+끝 `AR x:y`만(설명 없이) · `verbatim`=입력 원문 그대로(검사 결과는 별도) · `edit`=요청 변경과 보존 지시만 · 다중=엔트리당 `Title/Category(Cn)/Cut type/Prompt`. 작성만 요청된 경우 생성 도구를 호출하지 않는다.

`create` 전달 직전에는 에이전트가 추가한 카테고리·티어·도구/워크플로 라벨만 프롬프트 본문에서 제거한다. `Scene:`·`Camera:` 같은 콘텐츠 헤더, 사용자가 준 verbatim 텍스트, 이미지 안에 렌더할 정당한 라벨·카피는 보존한다.

## 라우팅 표 (유일 라우팅 지점)

| 요청 신호 | 카테고리/포맷 | 읽을 파일 |
|---|---|---|
| 단독 인물 화보·에디토리얼 | C1·Format B | `references/editorial-hwabo.md` (룩북·시퀀스·패션 21종 +`references/style-taxonomy.md`) |
| 타이포 포스터·글자가 곧 이미지 | TP1~TP17 | `references/typo-poster-router.md`→`references/typo-poster/TPn-*.md` 1개 |
| 활자 견본·글리프 세트·손절단 워드마크·인쇄 그라디언트 금속 | TP15~TP17 | `references/typo-poster-router.md`→ 해당 `TPn-*.md` 1개 |
| 홍보판촉물·브랜드 포스터·"디자인 잘된 포스터" | P1~P12 | `references/promo-router.md`→`references/promo/Pn-*.md` 1개. 카드뉴스 밀도 문법 금지(미감 사망) |
| 표지 판면(앨범커버·북커버·패키징 라벨)·색면 분할·회화 표지·간판체 콜라주 | P9~P12 | `references/promo-router.md`→ 해당 `Pn-*.md` 1개 |
| 포스터·키아트·인포그래픽·카드뉴스·만화·도감·아이콘·뷰티·캠페인·목업 | C2~C11 | `references/category-patterns.md` 해당 §. C6·C7=밀도 기본값·돌파 전술 §C6 |
| 프레젠테이션·슬라이드 덱 | C12 | `references/category-patterns.md` §C12 |
| 무드("있어보이게"·"럭셔리"·"영화처럼") | 룩 L1~L9 | `references/look-presets.md` 프리셋 1개 드롭인 |
| 시안 다변화·양산 컨셉·"차별화"·"컨셉부터" | M/R/X/T축 | `references/concept-axes.md` 축 1개 변주 |
| 글자 배치·폰트·그리드·밀집 텍스트 | — | `references/typography-layout.md` |
| 카메라·조명·색 어휘 | — | `references/photo-vocab.md` |
| jsonl 배치·모델 팩트·완성 예제·codex 골격·8섹션 변형 | — | `references/jsonl-and-examples.md` |
| intent 구분·부분 편집·정리 판단이 필요한 작업 | 필요할 때만 | `references/image-operations.md` |
| 실제 제공된 참조 이미지의 속성 분리 | 참조 작업일 때만 | `references/reference-images.md` |
| 생성 결과·파일 포맷·실물 확인 | 결과가 있을 때만 | `references/result-review.md` |

라우터(P/TP)는 패턴 1개 선택 후 해당 파일 **하나만** 로드.
복수 행이 동시에 매칭되면 **위쪽 행 우선**(표 순서 = 우선순위) — 경계 케이스는 각 라우터의 경계·교차 참조 절이 우선한다.

세 workflow 참조는 요청에 따라 지연 로드한다. 일반 새 창작은 기존 라우팅 패턴 하나를 사용하고, intent 구분·부분 편집·정리 판단이 필요할 때만 `image-operations.md`를 읽는다. 실제 참조 이미지가 있는 작업은 `reference-images.md`, 실제 결과를 확인할 때만 `result-review.md`를 읽는다. 한 장의 사진을 다룬다는 이유만으로 세 문서와 모든 장르 자료를 읽지 않는다.

## 철칙

1. **앞머리 `[AR x:y SIZE wxh]` 브래킷 금지.** size는 API 파라미터(jsonl `size`)로만, 프롬프트엔 끝 `AR x:y` 하나만. 슬롯 토큰(`[PERSONA_LOCK]` 류)은 작성 전용 — 잔존=실격(`E-SLOT-LEAK`).
2. **장면 배제는 전부 긍정형** — gpt-image-2는 장면 네거티브를 오히려 렌더한다(군중→"인물 한 명, 단독", 배경→"깨끗한 단색 배경"). 예외는 두 레인뿐, 우회가 아닌 컴플라이언스 스티어링.

   | 티어 | 조건 | 허용 문구 |
   |---|---|---|
   | Tier-0 기본 | 항상 | all-positive, 부정문 0개 |
   | Tier-1 텍스트 가드 | 렌더 텍스트 있을 때만 | 화이트리스트 7종: `no extra words` · `no duplicate text` · `no invented glyphs` · `no watermark` · `no logo` · `no extra text` · `verbatim, no extra characters` |
   | Tier-2 화보 레인 | 명시 선언 시만(휴리스틱 승격 금지) | SAFETY_ASSERT(긍정형, 피사체절)+NEGATIVE_TAIL(AR 직전 1회) **페어** 구조 |

   Tier-1 결합 공식(유일 방출형): `All text appears once, perfectly legible — no duplicate text, no extra words, no invented glyphs, no watermark.`
   Tier-2 고정 문자열·페어 규칙(순서 보존 부분집합·tail 단독 금지) 정본 = `references/editorial-hwabo.md` §3(여기 안 싣음). `Negative:` 라벨은 전 티어 금지(`E-NEG-SECTION`).

   | 빼려는 것 | 레인 |
   |---|---|
   | 장면 요소(사람·사물·배경·소품) | 긍정형 재서술(Tier-0) |
   | 텍스트 렌더 결함(중복·유령·워터마크) | Tier-1 화이트리스트 |
   | 정책 안전 단언(화보) | Tier-2 페어 |

3. **SD-era 폐기 어휘 금지.** `masterpiece/best quality/8k/4k/uhd/trending on artstation/ultra-detailed/highly detailed/sharp focus`, 가중치 `(word:1.3)`, `--ar/--v`, 본문 `§`, 빈 형용사(멋지게/감성적으로/고급스럽게/세련되게/beautiful/stunning).
   무대 지정("어워드 수준/전문가처럼/최고급")도 동급, 기준이 프롬프트 밖. 수치(여백 %·60/30/10·위계 단수)·몸 반응·구체 예시로 환원(concept-axes.md §죽은 단어 환원).
4. **장비 스펙→결과로 환원.** EXIF·장비명 대신 "shallow DoF, background falls off softly"·"warm key + cool rim". (패션 `Lens character:`·`Director signature:`는 결과+앵커라 예외.)
5. **새 창작의 사진적 조건에는 수치를 박는다.** 사진·포토리얼·사진 조명 중심 작업이면 HEX 팔레트(컷당 3~5색), 색온도, `key:fill 1:2` 같은 결과 수치를 쓴다. 선화·플랫 벡터·단색·텍스트 중심 등 요청 매체가 사진적이지 않으면 그 매체의 형태·배치·요청 색상 수치를 우선하고 사진 수치를 강제하지 않는다.
6. **1행 = 1컷 = 1 호출.** 한 캔버스 그리드/매트릭스 금지, 여러 컷은 N행.
7. **새 창작에서 실제 피부를 사진적으로 렌더할 때만 피부 질감을 명시한다.** 그 경우 "natural skin texture, visible pores, subtle film grain"처럼 구체화한다. 인물이 없거나 선화·플랫 벡터·비사진 매체이면 피부·필름 그레인을 새로 추가하지 않는다.
8. **실재 상표·인물 참조 금지**, 가상 브랜드/페르소나로.
9. **생성 후 글자 후처리 절대 금지.** 텍스트는 프롬프트로 이미지 안에서 렌더(따옴표 카피+롤라벨+자유 작성 존). PNG 위 코드 합성(PIL·ImageMagick·SVG/HTML·캔버스) 일절 금지, 폰트·커닝·톤이 겉돈다.
   글자 오류는 프롬프트 수정 후 재생성(타이포 구체화→`2048x2048`+quality high→카피 축소 순).

위의 새 장면 작성 의무는 `create`에 적용한다. `verbatim`은 언어 번역·문장 추가·라벨·HEX·AR 삽입으로 원문을 바꾸지 않으며, `edit`은 사용자가 요청한 변경과 보존 범위를 넘겨 장면·팔레트·조명·질감을 새로 쓰지 않는다. 입력·경로·제공값의 정합성 및 상위 안전 규칙은 intent와 무관하게 우선한다.

## 마스터 템플릿 (포맷 A 6섹션, `create`용)

순수 서술+HEX. 핵심 시각정보 최상단(첫 섹션=attention 최강). 헤더 `# 1. Scene` OK, 본문 `§` 금지.
아래 섹션·분량·HEX 골격은 새 프롬프트를 쓰는 `create`에 적용한다. `verbatim`과 `edit`이 입력에 이 골격이 없다는 이유로 원문을 재배열하거나 새 문장을 추가하지 않는다.

| # | 섹션 | 무엇을 / 분량 |
|---|---|---|
| 1 | **Scene** | 누가·무엇이·어디서·무엇을. 핵심 먼저. 60~120어 |
| 2 | **Camera** | 시점·거리·렌즈 character(결과 서술). 15~30어 |
| 3 | **Lighting** | 방향·soft/hard·그림자·림라이트(장비명 금지). 10~25어 |
| 4 | **Color grading** | 팔레트 + 색온도 + **HEX 3~5개**. 10~20어 |
| 5 | **Texture/Medium** | 매체·질감·표면 반응·후처리. 10~20어 |
| 6 | **Text-in-image** (선택) | `"따옴표 카피"` + 폰트·크기·위치 + legibility 1회. 0~25어 |
| — | 트레일링 | 끝에 `AR x:y` 토큰만 |

## 포맷 A / 포맷 B

- **포맷 A — 라벨 6섹션**(위 표): 구조물 전반(포스터·키아트·인포그래픽·도감·카드뉴스·만화 등).
- **포맷 B — 화보 플랫 콤마형 단문**: 라벨 없이 콤마 한 문단, 350~450자, 기본 AR `2:3`(1024x1536). 슬롯 12종 순서·Tier-2 → editorial-hwabo.md.
- 라우팅: 단독 인물 화보/글래머 에디토리얼→B, 그 외 전부→A.
- A/B의 골격·길이·슬롯은 `create`의 작성 선택이다. `verbatim`은 명시된 A/B와 무관하게 원문을 그대로 전달하고, `edit`은 요청된 변경·보존만 적는다. 검사기에서 `--format`을 주는 것은 판정 문맥이지 본문 rewrite 지시가 아니다.

## 기존 JSONL·러너 내보내기용 사이즈 표

아래 6종은 기존 JSONL·러너 계약의 호환 값이다. 내장 이미지 도구의 인자 목록이나 모든 이미지 모델의 보편적 제한으로 해석하지 않는다. 해당 러너로 내보낼 때는 기존 `auto` 금지·시퀀스 내 통일 규칙을 유지한다.

| ar | size | ar | size |
|---|---|---|---|
| 1:1 | `1024x1024` | 16:9 | `1792x1024` |
| 2:3 / 3:4 / 4:5 | `1024x1536` | 9:16 | `1024x1792` |
| 3:2 / 4:3 | `1536x1024` | 밀집/다컷 | `2048x2048` |

`2:3`만 정확비, `3:4`·`4:5`는 세로 근사. 비지원 값(`1024x1280` 등)도 가까운 6종으로.
내장 도구에 직접 전달할 때는 현재 도구 스키마를 따른다. 노출되지 않은 `size`·`quality` 인자를 임의로 만들지 않고, 요청 비율·품질 의도와 실제 결과의 픽셀 크기를 구분한다. 이 안내는 기존 CLI 실행기나 JSONL 필드를 변경하지 않는다.
> API 하드 제약·투명 배경(1.5 폴백): jsonl-and-examples.md §1.

## 텍스트 렌더 요점 (`create`용)

- 카피는 따옴표 고정+폰트·크기·위치·HEX, 한 줄 한 언어(한글+영문 혼합 금지). 카피 2개↑는 롤 라벨(headline/subhead/callout) 분리, 롤별 위치·크기·폰트 지정.
- 렌더 텍스트엔 Tier-1 결합 공식 1회(철칙 #2), 같은 카피 2회 표기=2회 렌더라 금지.
- 한글 스펠아웃 금지(하이픈이 글자로 렌더). 정확도 레버=캔버스 크기(2048 실측 12/12). 영문 조어만 ALL CAPS 최후수단. 라벨엔 실제 문구만.
- 밀집 텍스트(카피 3블록+/소형 글자)는 `quality: high`+큰 변 페어링(1536/1792·`2048x2048`).
- 국문/영문 혼용: 한국어=서사·무드·문화 명사·한글 카피, 영어=기법 토큰·티어 문구, 하이브리드=한국어 골격+영어 토큰. 상세 photo-vocab.md §8.

`verbatim`과 `edit`에는 위 텍스트 양식 의무를 새로 삽입하지 않는다. 원문 또는 사용자가 요청한 변경 범위를 우선하고, 검사 결과는 별도 상태로 전달한다.

## 검증기

응답·생성 전 `node scripts/check_prompt.mjs <file>`(stdin 가능).

- 기존 호출: `--tier <0|1|2>` 강제 / `--jsonl` 레코드 / `--api` E-SIZE-LOCK→warning(하드 제약 유지) / `--test` 셀프테스트. 새 플래그가 없으면 기존 판별·오류·출력 핵심 필드를 유지한다.
- 새 검사 모드: `--intent create|verbatim|edit`, `--format A|B`, `--medium-limits camera,lighting,photo-texture,palette-count`. `--intent` 또는 `--format`을 명시하면 새 모드이며 허용값 밖의 intent·format·medium 토큰은 오류다. `--medium-limits`는 고정된 CSV 토큰만 받는다.
- 매체 제한은 사진적 요건만 비적용으로 만든다. 레이아웃·배치·요청된 매체·요청 색상 확인은 유지한다. 새 모드의 비적용은 `skipped:[{code,reason}]`으로 드러내며 `MEDIUM_LIMIT`, `VERBATIM_PRESERVE`, `EDIT_SCOPE` 사유를 구분한다.
- C1에서 라벨 없는 내용 키워드만으로 의미를 확정할 수 없으면 `W-SEMANTIC-REVIEW`를 내고 실제 의미 확인이 필요하다고 적는다. 이 경고는 skipped도 자동 의미 합격도 아니다.
- 새 intent·format·medium 문맥은 검사기 호출 옵션에만 둔다. 기존 JSONL 레코드 스키마·실행기 입력 필드·배치 계약은 바꾸지 않는다.
- 티어 우선순위: `--tier` > jsonl `tier` > `lane`("editorial"→2) > 휴리스틱(렌더 텍스트→1, 없으면 0). Tier-2는 휴리스틱 승격 불가.
- 출력 `{ok, format, tier, errors[{code,msg,hint?}], warnings[{code,msg}]}`, errors 0=exit 0.
- 에러: `E-NEG-TIER`(미선언 상위 티어)·`E-SLOT-LEAK`·`E-SIZE-LOCK`, 네거티브·앞브래킷·SD어휘·가중치·슬래시플래그·끝AR누락.

검사 통과는 실제 렌더 품질이나 사용자 승인 상태가 아니다. `image-prompt-and-simplify`는 별도 작업으로 유지하며, 정리 원리의 일반화만 `references/result-review.md`에 둔다. 새 매체 사전·장르 기본값·보편 8슬롯·런타임·프로그래밍 가능한 승인 훅은 이 스킬에 추가하지 않는다.
