const GCP_RULE_MATRIX = {
  "gcp_lb->gcp_gce": [
    { protocol: "tcp", port: 80, source: "0.0.0.0/0", note: "HTTP from Load Balancer" },
    { protocol: "tcp", port: 443, source: "0.0.0.0/0", note: "HTTPS from Load Balancer" },
  ],
  "gcp_lb->gcp_mig": [
    { protocol: "tcp", port: 80, source: "0.0.0.0/0", note: "HTTP from Load Balancer" },
    { protocol: "tcp", port: 443, source: "0.0.0.0/0", note: "HTTPS from Load Balancer" },
  ],
  "gcp_lb->gcp_gke": [
    { protocol: "tcp", port: 80, source: "0.0.0.0/0", note: "HTTP from Load Balancer" },
    { protocol: "tcp", port: 443, source: "0.0.0.0/0", note: "HTTPS from Load Balancer" },
  ],
  "gcp_gce->gcp_cloudsql": [
    { protocol: "tcp", port: 5432, source: "vpc-internal", note: "PostgreSQL from GCE" },
    { protocol: "tcp", port: 3306, source: "vpc-internal", note: "MySQL from GCE" },
  ],
  "gcp_gce->gcp_memorystore": [
    { protocol: "tcp", port: 6379, source: "vpc-internal", note: "Redis from GCE" },
  ],
  "gcp_gke->gcp_cloudsql": [
    { protocol: "tcp", port: 5432, source: "vpc-internal", note: "PostgreSQL from GKE" },
  ],
  "gcp_gke->gcp_memorystore": [
    { protocol: "tcp", port: 6379, source: "vpc-internal", note: "Redis from GKE" },
  ],
  "gcp_cloud_run->gcp_cloudsql": [
    { protocol: "tcp", port: 5432, source: "serverless-connector", note: "PostgreSQL from Cloud Run" },
  ],
  "gcp_cloud_functions->gcp_cloudsql": [
    { protocol: "tcp", port: 5432, source: "serverless-connector", note: "PostgreSQL from Cloud Functions" },
  ],
  "gcp_cloud_functions->gcp_pubsub": [
    { protocol: "tcp", port: 443, source: "0.0.0.0/0", note: "Pub/Sub HTTPS" },
  ],
};

export function getGcpSuggestedRules(sourceType, targetType) {
  const key = `${sourceType}->${targetType}`;
  return GCP_RULE_MATRIX[key] ?? [];
}

export default GCP_RULE_MATRIX;
