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
  vpc_endpoint: AWSNode,
  vpn_gateway: AWSNode,
  direct_connect: AWSNode,
  global_accelerator: AWSNode,
  transit_gateway: AWSNode,

  // AWS — Compute
  ec2: AWSNode,
  lambda: AWSNode,
  auto_scaling_group: AWSNode,
  ecs_fargate: AWSNode,
  eks: AWSNode,
  app_runner: AWSNode,
  elastic_beanstalk: AWSNode,
  lightsail: AWSNode,
  batch: AWSNode,

  // AWS — Load Balancing / API
  alb: AWSNode,
  nlb: AWSNode,
  api_gateway: AWSNode,
  appsync: AWSNode,

  // AWS — Storage
  s3: AWSNode,
  ebs: AWSNode,
  efs: AWSNode,
  fsx: AWSNode,
  s3_glacier: AWSNode,
  storage_gateway: AWSNode,
  backup: AWSNode,

  // AWS — Database
  rds: AWSNode,
  aurora: AWSNode,
  dynamodb: AWSNode,
  elasticache: AWSNode,
  redshift: AWSNode,
  documentdb: AWSNode,
  neptune: AWSNode,
  timestream: AWSNode,
  opensearch: AWSNode,

  // AWS — Security
  security_group: AWSNode,
  iam_role: AWSNode,
  kms_key: AWSNode,
  acm: AWSNode,
  cognito: AWSNode,
  secretsmanager: AWSNode,
  waf: AWSNode,
  shield: AWSNode,
  guardduty: AWSNode,
  inspector: AWSNode,
  macie: AWSNode,
  security_hub: AWSNode,

  // AWS — Integration
  sns: AWSNode,
  sqs: AWSNode,
  eventbridge: AWSNode,
  step_functions: AWSNode,
  kinesis: AWSNode,
  kinesis_firehose: AWSNode,
  msk: AWSNode,
  mq: AWSNode,

  // AWS — Analytics / Data
  athena: AWSNode,
  glue: AWSNode,
  emr: AWSNode,
  quicksight: AWSNode,
  lakeformation: AWSNode,

  // AWS — AI / ML
  sagemaker: AWSNode,
  bedrock: AWSNode,
  rekognition: AWSNode,
  comprehend: AWSNode,
  textract: AWSNode,
  polly: AWSNode,
  translate: AWSNode,
  lex: AWSNode,

  // AWS — Developer Tools
  codecommit: AWSNode,
  codebuild: AWSNode,
  codedeploy: AWSNode,
  codepipeline: AWSNode,
  cloudformation: AWSNode,

  // AWS — Management / Observability
  cloudwatch: AWSNode,
  cloudtrail: AWSNode,
  config: AWSNode,
  systems_manager: AWSNode,
  xray: AWSNode,

  // AWS — Containers Registry
  ecr: AWSNode,

  // Azure — Networking
  azure_vnet: ContainerNode,
  azure_subnet: ContainerNode,
  azure_nsg: AWSNode,
  azure_agw: AWSNode,
  azure_lb: AWSNode,
  azure_frontdoor: AWSNode,
  azure_dns: AWSNode,
  azure_nat_gw: AWSNode,
  azure_vpn_gateway: AWSNode,
  azure_expressroute: AWSNode,
  azure_private_endpoint: AWSNode,
  azure_firewall: AWSNode,
  azure_ddos: AWSNode,
  azure_bastion: AWSNode,
  azure_traffic_mgr: AWSNode,

  // Azure — Compute
  azure_vm: AWSNode,
  azure_vmss: AWSNode,
  azure_aks: AWSNode,
  azure_functions: AWSNode,
  azure_aci: AWSNode,
  azure_app_service: AWSNode,
  azure_container_apps: AWSNode,
  azure_batch: AWSNode,
  azure_spring_apps: AWSNode,
  azure_static_web: AWSNode,

  // Azure — Storage
  azure_blob: AWSNode,
  azure_files: AWSNode,
  azure_disk: AWSNode,
  azure_datalake: AWSNode,
  azure_queue: AWSNode,
  azure_table: AWSNode,
  azure_backup: AWSNode,

  // Azure — Database
  azure_sql: AWSNode,
  azure_cosmosdb: AWSNode,
  azure_redis: AWSNode,
  azure_postgres: AWSNode,
  azure_mysql: AWSNode,
  azure_mariadb: AWSNode,
  azure_managed_instance: AWSNode,
  azure_synapse: AWSNode,

  // Azure — Security
  azure_keyvault: AWSNode,
  azure_aad: AWSNode,
  azure_waf: AWSNode,
  azure_managed_id: AWSNode,
  azure_defender: AWSNode,
  azure_sentinel: AWSNode,
  azure_policy: AWSNode,
  azure_purview: AWSNode,

  // Azure — Integration
  azure_servicebus: AWSNode,
  azure_eventhub: AWSNode,
  azure_logicapp: AWSNode,
  azure_apim: AWSNode,
  azure_notification_hub: AWSNode,
  azure_signalr: AWSNode,
  azure_bot: AWSNode,

  // Azure — Analytics / Data
  azure_datafactory: AWSNode,
  azure_stream_analytics: AWSNode,
  azure_databricks: AWSNode,
  azure_hdinsight: AWSNode,
  azure_search: AWSNode,

  // Azure — AI / ML
  azure_ml: AWSNode,
  azure_cognitive: AWSNode,
  azure_openai: AWSNode,

  // Azure — Developer Tools
  azure_devops: AWSNode,
  azure_acr: AWSNode,

  // Azure — Management / Observability
  azure_monitor: AWSNode,
  azure_log_analytics: AWSNode,
  azure_app_insights: AWSNode,

  // GCP — Networking
  gcp_vpc: ContainerNode,
  gcp_subnet: ContainerNode,
  gcp_firewall: AWSNode,
  gcp_lb: AWSNode,
  gcp_cdn: AWSNode,
  gcp_dns: AWSNode,
  gcp_nat: AWSNode,
  gcp_vpn: AWSNode,
  gcp_interconnect: AWSNode,
  gcp_network_endpoint_grp: AWSNode,
  gcp_private_sc: AWSNode,
  gcp_certificate_manager: AWSNode,

  // GCP — Compute
  gcp_gce: AWSNode,
  gcp_mig: AWSNode,
  gcp_gke: AWSNode,
  gcp_cloud_run: AWSNode,
  gcp_cloud_functions: AWSNode,
  gcp_app_engine: AWSNode,
  gcp_cloud_batch: AWSNode,

  // GCP — Storage
  gcp_gcs: AWSNode,
  gcp_filestore: AWSNode,
  gcp_persistent_disk: AWSNode,
  gcp_backup: AWSNode,

  // GCP — Database
  gcp_cloudsql: AWSNode,
  gcp_spanner: AWSNode,
  gcp_firestore: AWSNode,
  gcp_bigtable: AWSNode,
  gcp_memorystore: AWSNode,
  gcp_alloydb: AWSNode,
  gcp_datastore: AWSNode,

  // GCP — Security
  gcp_iam: AWSNode,
  gcp_secret_manager: AWSNode,
  gcp_armor: AWSNode,
  gcp_kms: AWSNode,
  gcp_scc: AWSNode,

  // GCP — Integration
  gcp_pubsub: AWSNode,
  gcp_dataflow: AWSNode,
  gcp_bigquery: AWSNode,
  gcp_apigee: AWSNode,
  gcp_tasks: AWSNode,
  gcp_scheduler: AWSNode,
  gcp_workflows: AWSNode,

  // GCP — Analytics / Data
  gcp_dataproc: AWSNode,
  gcp_analytics_hub: AWSNode,
  gcp_data_catalog: AWSNode,
  gcp_looker: AWSNode,
  gcp_cloud_composer: AWSNode,

  // GCP — AI / ML
  gcp_vertex_ai: AWSNode,
  gcp_automl: AWSNode,
  gcp_natural_lang: AWSNode,
  gcp_vision_ai: AWSNode,
  gcp_speech: AWSNode,
  gcp_translation: AWSNode,

  // GCP — Developer Tools
  gcp_cloud_build: AWSNode,
  gcp_cloud_deploy: AWSNode,
  gcp_source_repo: AWSNode,
  gcp_artifact_registry: AWSNode,

  // GCP — Management / Observability
  gcp_monitoring: AWSNode,
  gcp_logging: AWSNode,
  gcp_trace: AWSNode,
  gcp_error_reporting: AWSNode,

  // On-Prem — Containers
  onprem_network_zone: ContainerNode,
  onprem_vlan: ContainerNode,

  // On-Prem — Networking
  onprem_firewall: AWSNode,
  onprem_load_balancer: AWSNode,
  onprem_router: AWSNode,
  onprem_switch: AWSNode,
  onprem_dns: AWSNode,
  onprem_vpn: AWSNode,
  onprem_proxy: AWSNode,
  onprem_ids_ips: AWSNode,
  onprem_waf: AWSNode,

  // On-Prem — Compute
  onprem_bare_metal: AWSNode,
  onprem_vm: AWSNode,
  onprem_k8s: AWSNode,
  onprem_container: AWSNode,
  onprem_gpu_server: AWSNode,
  onprem_hyperconverged: AWSNode,

  // On-Prem — Storage
  onprem_san: AWSNode,
  onprem_nas: AWSNode,
  onprem_object_store: AWSNode,
  onprem_tape_library: AWSNode,
  onprem_backup_server: AWSNode,

  // On-Prem — Database
  onprem_postgres: AWSNode,
  onprem_mysql: AWSNode,
  onprem_mssql: AWSNode,
  onprem_redis: AWSNode,
  onprem_elasticsearch: AWSNode,
  onprem_mongodb: AWSNode,
  onprem_cassandra: AWSNode,

  // On-Prem — Security
  onprem_idp: AWSNode,
  onprem_vault: AWSNode,
  onprem_pam: AWSNode,
  onprem_ca: AWSNode,
  onprem_siem: AWSNode,

  // On-Prem — Integration
  onprem_message_broker: AWSNode,
  onprem_api_gateway: AWSNode,
  onprem_monitoring: AWSNode,
  onprem_ci_cd: AWSNode,
  onprem_service_mesh: AWSNode,
  onprem_tracing: AWSNode,
  onprem_log_aggregator: AWSNode,
  onprem_etl: AWSNode,

  // On-Prem — Dev Tools
  onprem_git_server: AWSNode,
  onprem_artifact_repo: AWSNode,
  onprem_config_mgmt: AWSNode,

  // Generic — unknown Terraform resource types imported from .tf files
  generic_tf: AWSNode,
};
