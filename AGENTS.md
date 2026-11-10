# SASAGo3 test_hannah 통합 개발

- 이 작업의 유일한 쓰기 대상 브랜치는 `test_hannah`입니다. 다른 브랜치를 수정·삭제하거나 다른 브랜치로 병합하지 않습니다. 강제 push 금지.
- 게임 규칙은 src/domain, 콘텐츠는 data/*.json, UI는 src/features/year-game에 둡니다. UI는 명령만 보내며 결과는 엔진이 계산합니다.
- 난수는 저장된 시드를 사용합니다. 콘텐츠/저장 변경 시 버전과 마이그레이션·테스트를 함께 갱신합니다.
- 인증·revision·원자적 저장을 우회하지 않습니다. 비밀값과 사용자 저장을 커밋하지 않습니다.
- 검증: npm run verify, npm run balance:simulate. 배포는 이 통합 작업 범위에 포함되지 않습니다.
- 최신 첨부 통합 문서의 확정 사항을 우선하며 애매하거나 미제공인 요구는 docs/integration-test-hannah.md에 기록합니다.
