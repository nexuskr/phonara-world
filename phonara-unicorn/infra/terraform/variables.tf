variable "aws_region"  { default = "ap-northeast-2" }
variable "project"     { default = "phonara" }
variable "environment" { default = "dev" }
variable "db_user"     { default = "phonara" }
variable "db_password" { sensitive = true }
