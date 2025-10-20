output "alb_dns_name" {
  value = module.alb.dns_name
}

output "mastra_dynamodb_table_name" {
  value = module.mastra_storage.dynamodb_table_id
}