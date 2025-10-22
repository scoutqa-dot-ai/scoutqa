module "cdn" {
  source = "terraform-aws-modules/cloudfront/aws"

  comment     = var.name
  price_class = "PriceClass_All"
  tags        = var.tags

  origin = {
    alb_origin = {
      domain_name = module.alb.dns_name
      custom_origin_config = {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "http-only"
        origin_ssl_protocols   = ["TLSv1", "TLSv1.1", "TLSv1.2"]
      }
    }
  }

  default_cache_behavior = {
    target_origin_id       = "alb_origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["HEAD", "DELETE", "POST", "GET", "OPTIONS", "PUT", "PATCH"]
    cached_methods         = ["HEAD", "GET"]
    compress               = true

    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader
    use_forwarded_values     = false
  }

  # Cache Next.js build assets by prefix
  ordered_cache_behavior = [
    {
      path_pattern           = "/_next/*"
      target_origin_id       = "alb_origin"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["HEAD", "GET", "OPTIONS"]
      cached_methods         = ["HEAD", "GET", "OPTIONS"]
      compress               = true

      cache_policy_id          = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
      origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader
      use_forwarded_values     = false
    }
  ]
}
