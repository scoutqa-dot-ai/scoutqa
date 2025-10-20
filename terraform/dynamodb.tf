module "mastra_storage" {
  source = "terraform-aws-modules/dynamodb-table/aws"

  name         = "${var.name}-mastra-storage"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"
  tags         = var.tags

  # https://github.com/mastra-ai/mastra/blob/fc2a774/stores/dynamodb/TABLE_SETUP.md
  attributes = [
    {
      name = "pk"
      type = "S"
    },
    {
      name = "sk"
      type = "S"
    },
    {
      name = "gsi1pk"
      type = "S"
    },
    {
      name = "gsi1sk"
      type = "S"
    },
    {
      name = "gsi2pk"
      type = "S"
    },
    {
      name = "gsi2sk"
      type = "S"
    }
  ]

  global_secondary_indexes = [
    {
      name            = "gsi1"
      hash_key        = "gsi1pk"
      range_key       = "gsi1sk"
      projection_type = "ALL"
    },
    {
      name            = "gsi2"
      hash_key        = "gsi2pk"
      range_key       = "gsi2sk"
      projection_type = "ALL"
    }
  ]
}