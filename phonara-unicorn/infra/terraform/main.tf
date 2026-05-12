# Phonara Unicorn — Terraform skeleton
# Targets: ECS Fargate cluster + SQS queues + S3 + RDS + CloudFront
# Status: SCAFFOLD — fill variables.tf and run `terraform init && plan` before apply.

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.aws_region
}

# ───────── Networking (use default VPC for scaffold; replace with managed VPC pre-prod)
data "aws_vpc" "default" { default = true }
data "aws_subnets" "default" {
  filter { name = "vpc-id" values = [data.aws_vpc.default.id] }
}

# ───────── S3 (rendered videos + thumbnails)
resource "aws_s3_bucket" "videos" {
  bucket = "${var.project}-videos-${var.environment}"
  force_destroy = var.environment != "prod"
}

# ───────── SQS (3 stages)
resource "aws_sqs_queue" "trend_discovered" { name = "${var.project}-trend-discovered-${var.environment}" }
resource "aws_sqs_queue" "script_ready"     { name = "${var.project}-script-ready-${var.environment}" }
resource "aws_sqs_queue" "video_rendered"   { name = "${var.project}-video-rendered-${var.environment}" }

# ───────── ECR repos
resource "aws_ecr_repository" "api"          { name = "${var.project}/api" }
resource "aws_ecr_repository" "worker_render" { name = "${var.project}/worker-render" }
resource "aws_ecr_repository" "worker_upload" { name = "${var.project}/worker-upload" }

# ───────── ECS cluster
resource "aws_ecs_cluster" "main" { name = "${var.project}-${var.environment}" }

# ───────── RDS (Postgres metadata; not user data — that stays in Supabase)
resource "aws_db_instance" "meta" {
  identifier         = "${var.project}-meta-${var.environment}"
  engine             = "postgres"
  engine_version     = "16"
  instance_class     = var.environment == "prod" ? "db.t4g.medium" : "db.t4g.micro"
  allocated_storage  = 20
  username           = var.db_user
  password           = var.db_password
  skip_final_snapshot = var.environment != "prod"
  publicly_accessible = false
}

# ───────── CloudFront (cdn.phonara.world)
resource "aws_cloudfront_distribution" "videos" {
  enabled = true
  origin {
    domain_name = aws_s3_bucket.videos.bucket_regional_domain_name
    origin_id   = "videos-s3"
  }
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "videos-s3"
    viewer_protocol_policy = "redirect-to-https"
    forwarded_values { query_string = false cookies { forward = "none" } }
  }
  restrictions { geo_restriction { restriction_type = "none" } }
  viewer_certificate { cloudfront_default_certificate = true }
}

# TODO: ECS task definitions (api/worker-render/worker-upload), ALB for api,
# IAM roles, autoscaling targets per task family, CloudWatch log groups.
