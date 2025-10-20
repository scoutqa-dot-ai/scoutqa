data "aws_caller_identity" "this" {}
data "aws_ecr_authorization_token" "token" {}

locals {
  source_path = ".."
  paths       = ["packages/scout-agent/src/**", "packages/scout-webapp/src/**"]
  files       = setunion([for f in local.paths : fileset(local.source_path, f)]...)
  dir_sha     = sha1(join("", [for f in local.files : filesha1("${local.source_path}/${f}")]))

  container_name = "scout-webapp"
  container_port = 3000

  vpc_cidr = "10.0.0.0/16"
}

provider "aws" {
  region = var.region
}

provider "docker" {
  registry_auth {
    address  = format("%v.dkr.ecr.%v.amazonaws.com", data.aws_caller_identity.this.account_id, var.region)
    username = data.aws_ecr_authorization_token.token.user_name
    password = data.aws_ecr_authorization_token.token.password
  }
}

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  name   = var.name
  cidr   = local.vpc_cidr
  tags   = var.tags

  azs            = var.region_azs
  public_subnets = [for k, v in var.region_azs : cidrsubnet(local.vpc_cidr, 8, k + 48)]
}

module "ecs_cluster" {
  source = "terraform-aws-modules/ecs/aws//modules/cluster"
  name   = "${var.name}-cluster"
  tags   = var.tags

  default_capacity_provider_strategy = {
    FARGATE = {
      weight = 100
      base   = 1
    }
  }
}

module "alb" {
  source = "terraform-aws-modules/alb/aws"
  name   = var.name
  tags   = var.tags

  load_balancer_type = "application"
  vpc_id             = module.vpc.vpc_id
  subnets            = module.vpc.public_subnets

  security_group_ingress_rules = {
    all_http = {
      from_port   = 80
      to_port     = 80
      ip_protocol = "tcp"
      cidr_ipv4   = "0.0.0.0/0"
    }
  }
  security_group_egress_rules = {
    all = {
      ip_protocol = "-1"
      cidr_ipv4   = module.vpc.vpc_cidr_block
    }
  }

  listeners = {
    http = {
      port     = 80
      protocol = "HTTP"
      forward = {
        target_group_key = "ex_ecs"
      }
    }
  }

  target_groups = {
    ex_ecs = {
      backend_protocol = "HTTP"
      backend_port     = local.container_port
      target_type      = "ip"

      health_check = {
        enabled             = true
        healthy_threshold   = 5
        interval            = 30
        matcher             = "200"
        path                = "/"
        port                = "traffic-port"
        protocol            = "HTTP"
        timeout             = 5
        unhealthy_threshold = 2
      }
      create_attachment = false
    }
  }
}

module "ecs_service" {
  source                 = "terraform-aws-modules/ecs/aws//modules/service"
  name                   = var.name
  cluster_arn            = module.ecs_cluster.arn
  enable_execute_command = true
  subnet_ids             = module.vpc.public_subnets
  tags                   = var.tags

  cpu              = 1024
  memory           = 2048
  assign_public_ip = true

  container_definitions = {
    (local.container_name) = {
      essential              = true
      image                  = module.docker_build.image_uri
      readonlyRootFilesystem = false

      portMappings = [
        {
          name          = local.container_name
          containerPort = local.container_port
          hostPort      = local.container_port
          protocol      = "tcp"
        }
      ]
    }
  }

  load_balancer = {
    service = {
      target_group_arn = module.alb.target_groups["ex_ecs"].arn
      container_name   = local.container_name
      container_port   = local.container_port
    }
  }

  security_group_ingress_rules = {
    alb_container_port = {
      from_port                    = local.container_port
      ip_protocol                  = "tcp"
      referenced_security_group_id = module.alb.security_group_id
    }
  }
  security_group_egress_rules = {
    all = {
      ip_protocol = "-1"
      cidr_ipv4   = "0.0.0.0/0"
    }
  }

  tasks_iam_role_name = "${var.name}-iam-role"
  tasks_iam_role_statements = [
    {
      actions = [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
      ]
      resources = ["*"]
    },
    {
      actions = [
        "bedrock-agentcore:StartBrowserSession",
        "bedrock-agentcore:GetBrowserSession"
      ]
      resources = ["*"]
    },
    {
      actions = [
        # https://mastra.ai/en/reference/storage/dynamodb
        "dynamodb:*",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ]
      resources = [
        module.mastra_storage.dynamodb_table_arn,
        "${module.mastra_storage.dynamodb_table_arn}/index/*"
      ]
    }
  ]
}

module "docker_build" {
  source = "terraform-aws-modules/lambda/aws//modules/docker-build"

  create_ecr_repo = true
  ecr_repo        = var.name
  ecr_repo_tags   = var.tags
  ecr_repo_lifecycle_policy = jsonencode({
    "rules" : [
      {
        "rulePriority" : 1,
        "description" : "Keep only the most recent images",
        "selection" : {
          "tagStatus" : "any",
          "countType" : "imageCountMoreThan",
          "countNumber" : 10
        },
        "action" : {
          "type" : "expire"
        }
      }
    ]
  })

  source_path   = local.source_path
  keep_remotely = true
  platform      = "linux/amd64"
  triggers = {
    dir_sha = local.dir_sha
  }
}
