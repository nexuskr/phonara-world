
# 무자본 부트스트랩 로드맵 — 세계 1위로 가는 0원 전략

조건: **외부 유료 서비스 X, 신규 인력 X, 광고비 X.** 사용 가능한 것은 이미 붙어 있는 **Lovable Cloud(무료 한도) + Lovable AI Gateway(무료 한도) + 기존 107개 테이블·25개 엣지함수**뿐입니다.

원칙은 단 하나 — **"있는 것을 극한까지 짜낸다"**. 비용을 쓰는 모든 항목(SOC2 감사·HackerOne·NFT 발행·Stripe·외부 SMS·유료 도구·해외 서버·앱스토어 등록비)은 **전부 보류**합니다.

---

## 0원으로 가능한 것 vs. 돈이 드는 것

| 영역 | 0원 가능 ✅ | 돈 필요 ❌ (보류) |
|---|---|---|
| 다언어 | i18n KO/EN/JA/ZH/ID/VI/ES/PT 8개 (번역은 Gemini Flash 무료 한도) | 전문 번역사 검수 |
| 신뢰 | `/trust/audit` 월간 PDF 자동생성, PoR 머클트리 자가공개 | SOC2·외부 회계감사 |
| 보안 | 자체 `/security` 정책 페이지 + 이메일 제보 | HackerOne·Immunefi |
| 성장 | Programmatic SEO·이메일 시퀀스·viral loop | 광고비·인플루언서 |
| AI | Gemini 2.5 Flash·Flash-Lite 무료 한도 활용 | GPT-5 Pro 대량 호출 |
| 결제 | 수동 입금 + USDT 지갑주소 공개 | Stripe·PG사 가맹 |
| 푸시 | 웹 Push API(이미 구축) | APNs 유료 인증서 |
| 운영 | DB cron + 엣지함수 자동화 | 외부 모니터링 SaaS |

---

## Phase 1 — "지금 당장, 사용자 없이도 1위처럼 보이게" (1~2주, 0원)

사용자가 들어왔을 때 **"이미 큰 플랫폼 같다"**는 인상을 주는 게 핵심.

1. **CEO Cockpit (`/admin/cockpit`)** — 기존 데이터 집계 1화면. 신규 인프라 0.
2. **글로벌 라이브 지구본** — `react-globe.gl`(MIT, 무료) + `user_devices` IP 미보유 시 timezone로 폴백.
3. **다언어 확장 (JA/ZH/ID/VI 4개 우선)** — Gemini Flash로 i18n JSON 자동 번역 → 수동 검수 0, 폴백은 EN.
4. **공개 메트릭 페이지 `/global/live`** — 라이브 펄스·지구본·SLA 한 페이지에 모아 SNS 공유용 OG.
5. **Founding Member 인증서(HTML/PNG)** — `html2canvas` 또는 SVG → 다운로드 + 공유. NFT 불필요.

## Phase 2 — "운영자 없이 운영되는 시스템" (2~4주, 0원)

무자본 = 1인 운영. **자동화가 곧 인건비**.

6. **AI 일일 운영 리포트** — Gemini 2.5 Flash로 `error_logs` + `anomaly_events` + `daily_stats` 요약 → 매일 09:00 cron → admin 푸시·이메일.
7. **AI 1차 고객지원** — `/support` 챗 → Gemini Flash가 FAQ 응답, 미해결시 `support_threads`로 escalation. 학습 데이터는 기존 `support_messages`.
8. **Auto-remediation v1** — 룰 기반:
   - `cron_settle_fail` → 3회 재시도 후 admin 알림
   - `low_insurance_fund` (잔액 임계치) → 출금 일시정지 + 알림
   - `policy_assertion_fail` → 슬랙 대신 admin 알림
9. **Lifecycle 이메일 5종** — D1/D3/D7/D14/D30. 이미 `email_send_log`·`process-email-queue` 있음. 템플릿만 추가.
10. **Capacity/Cost Watchdog** — `daily_stats` 추세 + Cloud 무료 한도 ($25/월) 사용량 추적 → 80% 도달 시 알림. 한도 초과 방지 = 비용 0 유지.

## Phase 3 — "외부에서 검증 가능한 신뢰" (3~6주, 0원)

돈 안 들이고 신뢰 신호를 최대화.

11. **월간 감사 PDF 자동생성** — 엣지함수에서 `trust_snapshots` → HTML → `puppeteer`/`pdf-lib` PDF → 스토리지 업로드. 서명은 Ed25519 키쌍 자체 보관.
12. **Proof-of-Reserves 페이지** — `wallet_balances` 머클트리 RPC + 사용자별 본인 잎 검증 도구. 외부 회계 없이도 *수학적*으로 증명.
13. **공개 Status RSS/JSON** — `/status.json`, `/status.rss`. 외부 모니터링 서비스가 자동 픽업.
14. **`/security` 정책 + 자체 Bug Bounty** — HackerOne 없이 이메일 제보 + 명예의 전당. 보상은 시즌패스 코인/티어 업으로 대체 = 현금 지출 0.
15. **Chaos 결과 공개 (`/trust/chaos`)** — 이미 `chaos_runs_public` 있음. 페이지만 추가.

## Phase 4 — "K-factor 1.0 이상" (지속, 0원)

무자본 성장의 유일한 길.

16. **Programmatic SEO 50~100 페이지** — 도시·언어·키워드 조합. 콘텐츠는 Gemini Flash로 1회 생성 → DB 저장 → SSG 라우트.
17. **Referral 누락 0%** — device fp + cookie + UTM 3중 폴백.
18. **공유 OG 카드 자동생성** — `/og/{type}/{id}.png` 엣지함수. 사용자가 인증서·랭킹·수익을 1탭에 공유.
19. **명예의 전당 영구 아카이브** — 주간 스냅샷 → 영구 페이지. SEO·바이럴 자산.
20. **Discord/Telegram 봇 (무료)** — `webhook_dispatcher`로 출금 milestone·신규 가입 자동 포스팅. 봇 호스팅은 엣지함수.

## Phase 5 — "한국 외 진출" (Phase 1 이후 언제든, 0원)

21. **PWA 완성** — manifest + service worker. 앱스토어 등록비 $99/$25 0.
22. **GDPR/CCPA 데이터 권리 RPC** — `request_data_export()` / `request_account_deletion()`. EU·미국 진입 차단 해제.
23. **다지역 법적 페이지** — Gemini로 초안 생성 → 표시만, 법률 자문은 사용자 매출 발생 후로 보류.

---

## 절대 지금 하지 말 것 (자본 생기기 전까지)

- ❌ Stripe·토스페이·PG 가맹 (월 고정비 + 정산수수료)
- ❌ NFT 온체인 발행 (가스비)
- ❌ 외부 SMS 게이트웨이 대량 발송
- ❌ 유료 모니터링(Datadog·Sentry Team 등)
- ❌ 외부 감사·SOC2·법률 자문
- ❌ 앱스토어 네이티브 등록
- ❌ 광고 집행
- ❌ 신규 직원·외주

대안: **모두 무료 한도 / 자체 구현 / 사용자 매출 발생 후 단계 도입**으로 대체.

---

## 권장 실행 순서 (각 1 user-message = 1 단계)

```text
Step 1   CEO Cockpit /admin/cockpit
Step 2   글로벌 라이브 지구본 위젯 + /global/live
Step 3   AI 일일 운영 리포트 (Gemini Flash cron)
Step 4   다언어 4개 확장 (JA/ZH/ID/VI, Gemini 자동번역)
Step 5   AI 1차 고객지원 챗
Step 6   Auto-remediation 룰 엔진 v1
Step 7   월간 감사 PDF 자동생성
Step 8   Proof-of-Reserves 머클트리 페이지
Step 9   Founding Member 인증서 PNG/PDF + 공유 OG
Step 10  Lifecycle 이메일 5종
Step 11  Programmatic SEO 도시별 50개
Step 12  /security 정책 페이지 + 자체 Bug Bounty
Step 13  공개 Status RSS/JSON
Step 14  PWA 완성 + 푸시 채널 분리
Step 15  GDPR/CCPA 데이터 권리 RPC
```

## 무자본 Top-3 우선

1. **Step 1 CEO Cockpit** — 0원, 즉시, 모든 데이터가 이미 있음. 가장 작은 비용으로 가장 큰 "프로같다"는 인식.
2. **Step 3 AI 일일 리포트** — Lovable AI 무료 한도($1/월)로 충분. 1인 운영을 가능하게 함.
3. **Step 11 Programmatic SEO** — 광고비 없이 트래픽을 만드는 유일한 방법. Gemini Flash로 콘텐츠 생성, 1회 작업으로 수개월 트래픽.

---

**어디부터 시작할지 알려주세요. 무자본 기준으로는 `Step 1 (CEO Cockpit)` → `Step 3 (AI 일일 리포트)` 순서를 강력 추천합니다.**
