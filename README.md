# Image Prompt Skill

현재 사용 중인 `image-prompt 4.0.0+local.2`의 독립 보관본입니다. GPT Image용 이미지 프롬프트 작성, 원문 전달, 부분 편집과 검사를 지원합니다.

## 구성과 사용

- 진입점: [SKILL.md](SKILL.md)
- 장르·참조·편집 지침: `references/`
- 프롬프트 검사기와 기존 테스트: `scripts/`

이 저장소를 로컬에 복제한 뒤 에이전트가 `SKILL.md`를 읽도록 지정하거나, 복제 폴더를 해당 에이전트의 스킬 디렉터리에 `image-prompt`라는 이름으로 연결합니다. 기존 설치가 있다면 덮어쓰기 전에 비교하세요.

```sh
node scripts/check_prompt.mjs --test
node scripts/fixtures/context.test.mjs
node scripts/check_prompt.mjs prompt.txt --intent create --format A
```

프롬프트 작성과 이미지 생성은 별도입니다. 이미지 생성 실행기와 계정 설정은 이 저장소에 포함하지 않습니다.

## 출처와 보존 범위

[gongnyang/gongnyang-prompt-kit](https://github.com/gongnyang/gongnyang-prompt-kit)의 이미지 스킬에 로컬 작성·참조·부분 편집 개선을 적용한 버전입니다. 원저작자의 [MIT 라이선스](LICENSE)를 보존합니다. 공식 업스트림 릴리스가 아닙니다.

2026-09-28 설치본의 스킬 파일을 그대로 복사했으며, 저장소 설명과 라이선스만 추가했습니다. 생성 결과의 품질을 새로 검증한 릴리스는 아닙니다.
