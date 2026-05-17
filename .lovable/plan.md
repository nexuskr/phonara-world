# Sound Assets Integration Plan (17 files)

업로드된 17개 mp3 를 코드가 기대하는 경로/이름으로 배치하고, `soundConfig.ts` 매핑을 업데이트합니다. money-flow 8 경로·Operator Isolation·Bundle Budget·Active Governor 는 손대지 않습니다 (정적 자산 + 설정 상수만 변경).

## 1. 파일 → 경로 매핑

### 공통 SFX (2개)
| 업로드 | 배치 경로 | 용도 |
|---|---|---|
| `coin_drop.mp3` | `public/sounds/common/sfx/coin_drop.mp3` | 코인 드롭 (기존 키 그대로) |
| `big_celebration.mp3` | `public/sounds/common/sfx/big_win_trigger.mp3` | BIG WIN 트리거 |

공통 SFX 키 중 `spin_start / reel_stop / button_click / mega_win / epic_win / legendary_win` 6 개는 업로드 파일에 대응 자산이 없음 → 기존처럼 **세션 캐시 + procedural fallback 으로 무음 진행** (404 0건 보장). `big_celebration` 1 개를 `big_win_trigger` 로만 매핑, mega/epic/legendary 는 그대로 fallback 유지 (BIG → MEGA → EPIC → LEGENDARY 톤 차이가 1 파일로는 표현 안 되므로 오히려 다 같은 소리로 깔지 않는 것이 Warm King UX 에 자연스러움).

### 슬롯별 spin (테마별 spin_start.mp3)
slotId 폴더의 `sfx/spin_start.mp3` 로 떨어지면 SlotSoundManager 가 자동 사용합니다 (등록 키 `spin_start` 는 공통이지만, 슬롯 폴더에 동명 파일이 있으면 register 안 됨 → 새 키 `theme_spin` 으로 추가하고 슬롯 진입 시 우선 재생).

| 업로드 | slotId | 배치 경로 |
|---|---|---|
| `olympus_spin.mp3` | olympus_legacy (= olympus_1000 alias) | `public/sounds/olympus_legacy/sfx/spin_start.mp3` + `public/sounds/olympus_1000/sfx/spin_start.mp3` |
| `sugarfever_spin.mp3` | sugar_fever | `public/sounds/sugar_fever/sfx/spin_start.mp3` |
| `pharaoh_spin.mp3` | pharaoh_vault (= pharaohs_vault_2500) | `public/sounds/pharaoh_vault/sfx/spin_start.mp3` + alias |
| `dragon_spin.mp3` | dragon_empire | `public/sounds/dragon_empire/sfx/spin_start.mp3` |
| `viking_spin.mp3` | viking_thunder_4000 | `public/sounds/viking_thunder_4000/sfx/spin_start.mp3` |
| `aztec_spin.mp3` | aztec_sun_1200 | `public/sounds/aztec_sun_1200/sfx/spin_start.mp3` |
| `cosmic_spin.mp3` | cosmic_forge (= cosmic_forge_5000) | `public/sounds/cosmic_forge/sfx/spin_start.mp3` + alias |
| `sakura_spin.mp3` | cherry_sakura (= cherry_sakura_500) | `public/sounds/cherry_sakura/sfx/spin_start.mp3` + alias |
| `neon_spin.mp3` | neon_tokyo_88 | `public/sounds/neon_tokyo_88/sfx/spin_start.mp3` |
| `crown_spin.mp3` | (공통 강조용) | `public/sounds/common/sfx/spin_start.mp3` — 모든 슬롯 fallback spin |

### 슬롯 미매칭 2개 (rename/보류 제안)
| 업로드 | 현황 | 권장 처리 |
|---|---|---|
| `wildwest_spin.mp3` | Wild West 슬롯이 아직 없음 (DB/페이지 무) | **`public/sounds/_unmapped/wildwest_spin.mp3`** 에 보관. 추후 Wild West 슬롯 추가 시 그대로 사용 |
| `deepsea_spin.mp3` | Deep Sea 슬롯 없음. 가장 가까운 분위기는 `pirate_curse` | **`public/sounds/pirate_curse/sfx/spin_start.mp3`** 로 배치 (해적/심해 음향 호환) + alias `pirates_curse_1500`. 원본도 `_unmapped/deepsea_spin.mp3` 백업 |

### Crash 게임 (3개)
현재 `/crash` 페이지엔 전용 사운드 매니저가 연결돼 있지 않음. **파일만 정자리에 배치**하고, 이번 PR 에선 소비 코드를 건드리지 않음 (Crash 페이지는 게임 로직 = money-flow 인접 → 동결).

| 업로드 | 배치 경로 |
|---|---|
| `crash_tension.mp3` | `public/sounds/crash/sfx/tension.mp3` |
| `crash_explosion.mp3` | `public/sounds/crash/sfx/explosion.mp3` |
| `crash_cashout.mp3` | `public/sounds/crash/sfx/cashout.mp3` |

향후 별도 PR (`PR-CRASH-AUDIO`) 에서 Crash 페이지 hook 만 추가.

## 2. 코드 변경 (최소 surface)

### A. `src/lib/sounds/soundConfig.ts`
- `SOUND_PATHS.common.spin_start` 유지 (이제 실파일 존재 = crown_spin)
- `SOUND_PATHS.common.coin_drop` 유지 (실파일 존재)
- `SOUND_PATHS.common.big_win_trigger` 유지 (실파일 존재)
- `SLOT_SOUND_MAP` 각 슬롯의 `sfx` 배열에 `"spin_start"` 추가 → 슬롯별 폴더 spin 자동 등록
  - 이미 `commonHowls` 에 `spin_start` 가 있어 `resolveEntry` 가 슬롯 우선 → 테마 spin 재생, 미존재 슬롯은 공통 fallback (crown_spin)
- `SLOT_ID_TO_SOUND_KEY` 에 `viking_thunder_4000`, `aztec_sun_1200` canonical 추가 (현재 SLOT_SOUND_MAP 에 entry 없음) → 둘은 spin 1개만 가지므로 entry 신설:
  ```
  viking_thunder_4000: { sfx:["spin_start"], voice:[], legendary:{primary:"legendary_win"} }
  aztec_sun_1200:      { sfx:["spin_start"], voice:[], legendary:{primary:"legendary_win"} }
  ```

### B. `public/sounds/**` 정적 자산 배치
17 개 파일 복사. `_headers` (immutable assets) 가 이미 매칭하므로 cache 정책 OK. Bundle budget 미영향 (정적 자산).

### C. 변경 없음 (확인용)
- `src/lib/sounds/SlotSoundManager.ts` — 세션 404 캐시 & procedural fallback 그대로 동작
- `src/hooks/useSlotSound.ts` — 변경 없음
- money-flow 8경로 / Crash 페이지 / Operator 청크 / Realtime 래퍼 — 무손상
- `supabase/**` — 무변경

## 3. 검증

1. 빌드 (자동) — 자산 추가만이므로 budget 영향 없음
2. 슬롯 진입 시 네트워크 탭: `/sounds/{slotId}/sfx/spin_start.mp3` 200 응답 확인
3. 미배치 슬롯(예: wizard_2000) 진입 → 공통 `spin_start.mp3` (crown_spin) fallback 정상
4. SPIN 첫 클릭 시 SFX 재생, BIG WIN ≥50x 시 `big_celebration` 재생
5. `phonara:audio:missing:v1` sessionStorage 가 비어 있어야 함 (404 0건)

## 4. 산출물 요약

- 17 mp3 파일 → `public/sounds/...` 12 경로 + 4 alias 사본 + 1 백업
- `src/lib/sounds/soundConfig.ts` 1 파일 수정
- 코드/머니플로우 변경 0줄
