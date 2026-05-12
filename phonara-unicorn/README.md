# 🚀 phonara-unicorn — AWS Content Factory (V17 Phase U)

별도 모노레포로 분리 가능한 AI 콘텐츠 자동화 인프라 스캐폴드.
**메인 Lovable 앱(Phonara.world)의 supabase + Vercel 스택은 그대로 두고**, 일 10,000 video 생성/배포만 이쪽이 담당합니다.

## 🎯 목표

| 단계 | 처리량 | 인프라 비용/월 (예상) |
|------|--------|----------------------|
| U.1  | 100 video/day  | $200 (Fargate 5 task) |
| U.2  | 1,000 video/day | $1,500 (Fargate 30 task) |
| U.3  | 5,000 video/day | $7,000 (Fargate 120 task) |
| U.4  | 10,000 video/day | $14,000 (Fargate 230 task + Spot) |

## 📦 구조

```
phonara-unicorn/
├── apps/
│   ├── api/              NestJS — 트렌드 수집, 스크립트 큐잉, 메트릭 API
│   ├── worker-render/    Node + FFmpeg — 영상 합성 워커
│   └── worker-upload/    Node — TikTok/IG/YT 업로드 워커
├── infra/
│   └── terraform/        ECS Fargate + SQS + S3 + RDS + CloudFront
├── .github/workflows/    CI/CD (build → ECR → ECS deploy)
└── docker-compose.yml    로컬 개발용 (Redis/Postgres/MinIO)
```

## 🔄 데이터 플로우

```
TrendFetcher (cron 5m)
   ↓ SQS: trend.discovered
ScriptGenerator (Lovable AI Gemini)
   ↓ SQS: script.ready
RenderWorker (FFmpeg + TTS + avatar)
   ↓ S3: phonara-videos/{video_id}.mp4
   ↓ SQS: video.rendered
UploadWorker (region별 best-time 큐잉)
   ↓ TikTok/IG/YT API
MetricsCollector (1h cron)
   ↓ Supabase REST: viral_metrics upsert
   ↓ Supabase REST: revenue_events insert (광고 수익)
```

## 🔌 메인 앱 연동

- **DB 쓰기**: Supabase REST + service role (`SUPABASE_SERVICE_ROLE_KEY` env)
  - `viral_metrics` 직접 upsert 또는 `viral-score-compute` 엣지 호출
  - `posting_schedule_queue` insert (region/scheduled_at)
  - `revenue_events` ← `revenue-attribution` 엣지 호출
- **DB 읽기**: `posting_schedule_queue` where status='queued' → 업로드 후 'posted' 마킹
- **CDN**: 메인 앱 `<FeedCard>`의 thumbnail/video URL은 `https://cdn.phonara.world/videos/{id}.{mp4|jpg}` (CloudFront)

## 🚀 배포

```bash
cd phonara-unicorn/infra/terraform
terraform init && terraform apply
# → ECR repo, ECS cluster, SQS queues, S3 bucket, RDS, CloudFront 배포

cd ../../apps/api && docker build -t phonara-api . && docker push <ECR>/phonara-api
# 이후는 GH Actions가 자동
```

## ⚠️ 현재 상태

이 디렉터리는 **스캐폴드 초안**입니다. 실제 ECR 푸시, 도메인 연결, secrets 주입은 Phase U.1 시작 시 별도 PR로 진행합니다.
실배포 전 반드시 `apps/*/src/`의 TODO와 `infra/terraform/variables.tf`를 채워야 합니다.
