variable "name" {
  type    = string
  default = "scoutqa"
}

variable "langfuse_secret_key" {
  type      = string
  sensitive = true
}

variable "langfuse_public_key" {
  type    = string
}

variable "langfuse_baseurl" {
  type    = string
  default = "https://us.cloud.langfuse.com"
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "region_azs" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "tags" {
  type = map(string)
  default = {
    service    = "scoutqa"
  }
}