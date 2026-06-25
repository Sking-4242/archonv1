/**
 * Copy official cloud provider icons into frontend/src/assets/icons/{azure,gcp,providers}.
 * Requires extracted zips under src/assets/icons/_tmp/ (see README in _tmp or run download first).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ICONS = path.join(ROOT, "src/assets/icons");
const AZ_SRC = path.join(ICONS, "_tmp/azure/Azure_Public_Service_Icons/Icons");
const GCP_CORE = path.join(ICONS, "_tmp/gcp-core");
const GCP_CAT = path.join(ICONS, "_tmp/gcp-cat");

function findIcon(root, fragment) {
  if (!fs.existsSync(root)) return null;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile() && ent.name.endsWith(".svg") && ent.name.includes(fragment)) return full;
    }
  }
  return null;
}

function copySrc(src, destName, destDir) {
  if (!src || !fs.existsSync(src)) {
    console.warn(`  missing: ${destName} (${src})`);
    return false;
  }
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, path.join(destDir, destName));
  return true;
}

/** Azure palette type → icon filename fragment in official zip */
const AZURE_MAP = {
  azure_vnet: "10061-icon-service-Virtual-Networks.svg",
  azure_subnet: "02742-icon-service-Subnet.svg",
  azure_nsg: "10067-icon-service-Network-Security-Groups.svg",
  azure_agw: "10076-icon-service-Application-Gateways.svg",
  azure_lb: "10062-icon-service-Load-Balancers.svg",
  azure_frontdoor: "10073-icon-service-Front-Door-and-CDN-Profiles.svg",
  azure_dns: "10064-icon-service-DNS-Zones.svg",
  azure_nat_gw: "10310-icon-service-NAT.svg",
  azure_vpn_gateway: "10063-icon-service-Virtual-Network-Gateways.svg",
  azure_expressroute: "10079-icon-service-ExpressRoute-Circuits.svg",
  azure_traffic_mgr: "10065-icon-service-Traffic-Manager-Profiles.svg",
  azure_bastion: "02422-icon-service-Bastions.svg",
  azure_private_endpoint: "00427-icon-service-Private-Link.svg",
  azure_firewall: "10084-icon-service-Firewalls.svg",
  azure_ddos: "10072-icon-service-DDoS-Protection-Plans.svg",
  azure_vm: "10021-icon-service-Virtual-Machine.svg",
  azure_vmss: "10034-icon-service-VM-Scale-Sets.svg",
  azure_aks: "10023-icon-service-Kubernetes-Services.svg",
  azure_functions: "10029-icon-service-Function-Apps.svg",
  azure_aci: "10104-icon-service-Container-Instances.svg",
  azure_app_service: "10035-icon-service-App-Services.svg",
  azure_container_apps: "02989-icon-service-Container-Apps-Environments.svg",
  azure_batch: "10031-icon-service-Batch-Accounts.svg",
  azure_spring_apps: "10370-icon-service-Azure-Spring-Apps.svg",
  azure_static_web: "01007-icon-service-Static-Apps.svg",
  azure_acr: "10105-icon-service-Container-Registries.svg",
  azure_blob: "10780-icon-service-Blob-Block.svg",
  azure_files: "10838-icon-service-Storage-Azure-Files.svg",
  azure_disk: "10032-icon-service-Disks.svg",
  azure_table: "10841-icon-service-Storage-Tables.svg",
  azure_queue: "10840-icon-service-Storage-Queue.svg",
  azure_datalake: "10150-icon-service-Data-Lake-Store-Gen1.svg",
  azure_backup: "02360-icon-service-Azure-Backup-Center.svg",
  azure_sql: "10137-icon-service-SQL-Database.svg",
  azure_cosmosdb: "10121-icon-service-Azure-Cosmos-DB.svg",
  azure_redis: "03675-icon-service-Azure-Managed-Redis.svg",
  azure_postgres: "01848-icon-service-Arc-PostgreSQL",
  azure_mysql: "10122-icon-service-Azure-Database-MySQL-Server.svg",
  azure_mariadb: "10123-icon-service-Azure-Database-MariaDB-Server.svg",
  azure_synapse: "00606-icon-service-Azure-Synapse-Analytics.svg",
  azure_managed_instance: "10136-icon-service-SQL-Managed-Instance.svg",
  azure_keyvault: "10245-icon-service-Key-Vaults.svg",
  azure_aad: "10225-icon-service-Enterprise-Applications.svg",
  azure_waf: "10362-icon-service-Web-Application-Firewall-Policies",
  azure_defender: "10241-icon-service-Microsoft-Defender-for-Cloud.svg",
  azure_sentinel: "10248-icon-service-Azure-Sentinel.svg",
  azure_managed_id: "10227-icon-service-Entra-Managed-Identities.svg",
  azure_policy: "10316-icon-service-Policy.svg",
  azure_servicebus: "10836-icon-service-Azure-Service-Bus.svg",
  azure_eventhub: "00039-icon-service-Event-Hubs.svg",
  azure_logicapp: "02631-icon-service-Logic-Apps.svg",
  azure_apim: "10042-icon-service-API-Management-Services.svg",
  azure_signalr: "10052-icon-service-SignalR.svg",
  azure_notification_hub: "02740-icon-service-Notification-Hubs.svg",
  azure_datafactory: "00026-icon-service-Data-Factories.svg",
  azure_stream_analytics: "00042-icon-service-Stream-Analytics-Jobs.svg",
  azure_databricks: "10787-icon-service-Azure-Databricks.svg",
  azure_hdinsight: "10142-icon-service-HDInsight-Clusters.svg",
  azure_purview: "02545-icon-service-Azure-Purview-Accounts.svg",
  azure_openai: "03438-icon-service-Azure-OpenAI.svg",
  azure_cognitive: "03173-icon-service-Cognitive-Services-Decisions.svg",
  azure_ml: "10166-icon-service-Machine-Learning-Studio-Workspaces.svg",
  azure_bot: "10165-icon-service-Bot-Services.svg",
  azure_search: "10044-icon-service-Cognitive-Search.svg",
  azure_monitor: "00001-icon-service-Monitor.svg",
  azure_app_insights: "00012-icon-service-Application-Insights.svg",
  azure_log_analytics: "00009-icon-service-Log-Analytics-Workspaces.svg",
  azure_devops: "10261-icon-service-Azure-DevOps.svg",
};

const GCP_CORE_MAP = {
  gcp_gce: "Compute Engine/SVG/ComputeEngine-512-color-rgb.svg",
  gcp_gke: "GKE/SVG/GKE-512-color.svg",
  gcp_cloud_run: "Cloud Run/SVG/CloudRun-512-color-rgb.svg",
  gcp_gcs: "Cloud Storage/SVG/Cloud_Storage-512-color.svg",
  gcp_cloudsql: "Cloud SQL/SVG/CloudSQL-512-color.svg",
  gcp_spanner: "Cloud Spanner/SVG/CloudSpanner-512-color.svg",
  gcp_alloydb: "AlloyDB/SVG/AlloyDB-512-color.svg",
  gcp_bigquery: "BigQuery/SVG/BigQuery-512-color.svg",
  gcp_apigee: "Apigee/SVG/Apigee-512-color-rgb.svg",
  gcp_vertex_ai: "Vertex AI/SVG/VertexAI-512-color.svg",
  gcp_looker: "Looker/SVG/Looker-512-color.svg",
  gcp_scc: "Security Command Center/SVG/SecurityCommandCenter-512-color.svg",
};

const GCP_CAT_MAP = {
  gcp_vpc: "Networking/SVG/Networking-512-color-rgb.svg",
  gcp_subnet: "Networking/SVG/Networking-512-color-rgb.svg",
  gcp_firewall: "Security Identity/SVG/SecurityIdentity-512-color.svg",
  gcp_lb: "Networking/SVG/Networking-512-color-rgb.svg",
  gcp_cdn: "Networking/SVG/Networking-512-color-rgb.svg",
  gcp_dns: "Networking/SVG/Networking-512-color-rgb.svg",
  gcp_nat: "Networking/SVG/Networking-512-color-rgb.svg",
  gcp_vpn: "Networking/SVG/Networking-512-color-rgb.svg",
  gcp_interconnect: "Networking/SVG/Networking-512-color-rgb.svg",
  gcp_private_sc: "Networking/SVG/Networking-512-color-rgb.svg",
  gcp_network_endpoint_grp: "Networking/SVG/Networking-512-color-rgb.svg",
  gcp_mig: "Compute/SVG/Compute-512-color.svg",
  gcp_cloud_functions: "Serverless Computing/SVG/ServerlessComputing-512-color.svg",
  gcp_app_engine: "Serverless Computing/SVG/ServerlessComputing-512-color.svg",
  gcp_cloud_batch: "Compute/SVG/Compute-512-color.svg",
  gcp_cloud_composer: "Operations/SVG/Operations-512-color.svg",
  gcp_filestore: "Storage/SVG/Storage-512-color.svg",
  gcp_persistent_disk: "Storage/SVG/Storage-512-color.svg",
  gcp_backup: "Storage/SVG/Storage-512-color.svg",
  gcp_firestore: "Databases/SVG/Databases-512-color.svg",
  gcp_bigtable: "Databases/SVG/Databases-512-color.svg",
  gcp_memorystore: "Databases/SVG/Databases-512-color.svg",
  gcp_datastore: "Databases/SVG/Databases-512-color.svg",
  gcp_iam: "Security Identity/SVG/SecurityIdentity-512-color.svg",
  gcp_secret_manager: "Security Identity/SVG/SecurityIdentity-512-color.svg",
  gcp_armor: "Security Identity/SVG/SecurityIdentity-512-color.svg",
  gcp_kms: "Security Identity/SVG/SecurityIdentity-512-color.svg",
  gcp_certificate_manager: "Security Identity/SVG/SecurityIdentity-512-color.svg",
  gcp_pubsub: "Integration Services/SVG/IntegrationServices-512-color.svg",
  gcp_dataflow: "Data Analytics/SVG/DataAnalytics-512-color.svg",
  gcp_tasks: "Integration Services/SVG/IntegrationServices-512-color.svg",
  gcp_scheduler: "Integration Services/SVG/IntegrationServices-512-color.svg",
  gcp_workflows: "Integration Services/SVG/IntegrationServices-512-color.svg",
  gcp_dataproc: "Data Analytics/SVG/DataAnalytics-512-color.svg",
  gcp_data_catalog: "Data Analytics/SVG/DataAnalytics-512-color.svg",
  gcp_analytics_hub: "Data Analytics/SVG/DataAnalytics-512-color.svg",
  gcp_automl: "AI _ Machine Learning/SVG/AIMachineLearning-512-color.svg",
  gcp_vision_ai: "AI _ Machine Learning/SVG/AIMachineLearning-512-color.svg",
  gcp_speech: "AI _ Machine Learning/SVG/AIMachineLearning-512-color.svg",
  gcp_translation: "AI _ Machine Learning/SVG/AIMachineLearning-512-color.svg",
  gcp_natural_lang: "AI _ Machine Learning/SVG/AIMachineLearning-512-color.svg",
  gcp_monitoring: "Observability/SVG/Observability-512-color.svg",
  gcp_logging: "Observability/SVG/Observability-512-color.svg",
  gcp_trace: "Observability/SVG/Observability-512-color.svg",
  gcp_error_reporting: "Observability/SVG/Observability-512-color.svg",
  gcp_cloud_build: "DevOps/SVG/DevOps-512-color.svg",
  gcp_cloud_deploy: "DevOps/SVG/DevOps-512-color.svg",
  gcp_artifact_registry: "DevOps/SVG/DevOps-512-color.svg",
  gcp_source_repo: "DevOps/SVG/DevOps-512-color.svg",
};

function resolveAzure(fragment) {
  if (fragment.endsWith(".svg")) return findIcon(AZ_SRC, fragment.replace(".svg", ""));
  return findIcon(AZ_SRC, fragment);
}

function resolveGcpCore(rel) {
  const p = path.join(GCP_CORE, "Unique Icons", rel);
  return fs.existsSync(p) ? p : null;
}

function resolveGcpCat(rel) {
  const p = path.join(GCP_CAT, "Category Icons", rel);
  return fs.existsSync(p) ? p : null;
}

let azureOk = 0;
let azureMiss = 0;
for (const [type, fragment] of Object.entries(AZURE_MAP)) {
  const src = resolveAzure(fragment);
  if (copySrc(src, `${type}.svg`, path.join(ICONS, "azure"))) azureOk++;
  else azureMiss++;
}

let gcpOk = 0;
let gcpMiss = 0;
for (const [type, rel] of Object.entries(GCP_CORE_MAP)) {
  const src = resolveGcpCore(rel);
  if (copySrc(src, `${type}.svg`, path.join(ICONS, "gcp"))) gcpOk++;
  else gcpMiss++;
}
for (const [type, rel] of Object.entries(GCP_CAT_MAP)) {
  const src = resolveGcpCat(rel);
  if (copySrc(src, `${type}.svg`, path.join(ICONS, "gcp"))) gcpOk++;
  else gcpMiss++;
}

console.log(`Azure: ${azureOk} copied, ${azureMiss} missing`);
console.log(`GCP: ${gcpOk} copied, ${gcpMiss} missing`);
