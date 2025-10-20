output "cdn_domain_name" {
  value = module.cdn.cloudfront_distribution_domain_name
}

output "mastra_dynamodb_table_name" {
  value = module.mastra_storage.dynamodb_table_id
}
