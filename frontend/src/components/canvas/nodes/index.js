import AWSNode from "./AWSNode";
import ContainerNode from "./ContainerNode";

export const nodeTypes = {
  // AWS — Containers
  vpc: ContainerNode,
  subnet: ContainerNode,

  // AWS — Networking
  internet_gateway: AWSNode,
  nat_gateway: AWSNode,
  route_table: AWSNode,
  elastic_ip: AWSNode,
  cloudfront: AWSNode,
  route53: AWSNode,

  // AWS — Compute
  ec2: AWSNode,
  lambda: AWSNode,
  auto_scaling_group: AWSNode,
  ecs_fargate: AWSNode,
  eks: AWSNode,

  // AWS — Load Balancing / API
  alb: AWSNode,
  nlb: AWSNode,
  api_gateway: AWSNode,

  // AWS — Storage
  s3: AWSNode,
  ebs: AWSNode,

  // AWS — Database
  rds: AWSNode,
  dynamodb: AWSNode,
  elasticache: AWSNode,

  // AWS — Security
  security_group: AWSNode,
  iam_role: AWSNode,
  kms_key: AWSNode,
  acm: AWSNode,
  cognito: AWSNode,

  // AWS — Integration
  sns: AWSNode,
  sqs: AWSNode,
  eventbridge: AWSNode,
  step_functions: AWSNode,
  kinesis: AWSNode,

  // Azure — Networking
  azure_vnet: ContainerNode,
  azure_subnet: ContainerNode,
  azure_nsg: AWSNode,
  azure_agw: AWSNode,
  azure_lb: AWSNode,
  azure_frontdoor: AWSNode,
  azure_dns: AWSNode,
  azure_nat_gw: AWSNode,

  // Azure — Compute
  azure_vm: AWSNode,
  azure_vmss: AWSNode,
  azure_aks: AWSNode,
  azure_functions: AWSNode,
  azure_aci: AWSNode,
  azure_app_service: AWSNode,

  // Azure — Storage
  azure_blob: AWSNode,
  azure_files: AWSNode,
  azure_disk: AWSNode,

  // Azure — Database
  azure_sql: AWSNode,
  azure_cosmosdb: AWSNode,
  azure_redis: AWSNode,
  azure_postgres: AWSNode,

  // Azure — Security
  azure_keyvault: AWSNode,
  azure_aad: AWSNode,
  azure_waf: AWSNode,

  // Azure — Integration
  azure_servicebus: AWSNode,
  azure_eventhub: AWSNode,
  azure_logicapp: AWSNode,
  azure_apim: AWSNode,

  // GCP — Networking
  gcp_vpc: ContainerNode,
  gcp_subnet: ContainerNode,
  gcp_firewall: AWSNode,
  gcp_lb: AWSNode,
  gcp_cdn: AWSNode,
  gcp_dns: AWSNode,
  gcp_nat: AWSNode,

  // GCP — Compute
  gcp_gce: AWSNode,
  gcp_mig: AWSNode,
  gcp_gke: AWSNode,
  gcp_cloud_run: AWSNode,
  gcp_cloud_functions: AWSNode,
  gcp_app_engine: AWSNode,

  // GCP — Storage
  gcp_gcs: AWSNode,
  gcp_filestore: AWSNode,
  gcp_persistent_disk: AWSNode,

  // GCP — Database
  gcp_cloudsql: AWSNode,
  gcp_spanner: AWSNode,
  gcp_firestore: AWSNode,
  gcp_bigtable: AWSNode,
  gcp_memorystore: AWSNode,

  // GCP — Security
  gcp_iam: AWSNode,
  gcp_secret_manager: AWSNode,
  gcp_armor: AWSNode,

  // GCP — Integration
  gcp_pubsub: AWSNode,
  gcp_dataflow: AWSNode,
  gcp_bigquery: AWSNode,
  gcp_apigee: AWSNode,

  // On-Prem — Networking
  onprem_network_zone: ContainerNode,
  onprem_vlan: ContainerNode,
  onprem_firewall: AWSNode,
  onprem_load_balancer: AWSNode,
  onprem_router: AWSNode,
  onprem_switch: AWSNode,

  // On-Prem — Compute
  onprem_bare_metal: AWSNode,
  onprem_vm: AWSNode,
  onprem_k8s: AWSNode,
  onprem_container: AWSNode,

  // On-Prem — Storage
  onprem_san: AWSNode,
  onprem_nas: AWSNode,
  onprem_object_store: AWSNode,

  // On-Prem — Database
  onprem_postgres: AWSNode,
  onprem_mysql: AWSNode,
  onprem_redis: AWSNode,
  onprem_elasticsearch: AWSNode,

  // On-Prem — Security
  onprem_idp: AWSNode,
  onprem_vault: AWSNode,
  onprem_waf: AWSNode,

  // On-Prem — Integration
  onprem_message_broker: AWSNode,
  onprem_api_gateway: AWSNode,
  onprem_monitoring: AWSNode,
  onprem_ci_cd: AWSNode,

  // Generic — unknown Terraform resource types imported from .tf files
  // Renders with gray styling; awsType shows the raw TF resource type name
  generic_tf: AWSNode,
};
