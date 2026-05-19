const ONPREM_RULE_MATRIX = {
  "onprem_load_balancer->onprem_bare_metal": [
    { protocol: "tcp", port: 80, source: "lb-vip", note: "HTTP from Load Balancer" },
    { protocol: "tcp", port: 443, source: "lb-vip", note: "HTTPS from Load Balancer" },
  ],
  "onprem_load_balancer->onprem_vm": [
    { protocol: "tcp", port: 80, source: "lb-vip", note: "HTTP from Load Balancer" },
    { protocol: "tcp", port: 443, source: "lb-vip", note: "HTTPS from Load Balancer" },
  ],
  "onprem_load_balancer->onprem_k8s": [
    { protocol: "tcp", port: 80, source: "lb-vip", note: "HTTP from Load Balancer" },
    { protocol: "tcp", port: 443, source: "lb-vip", note: "HTTPS from Load Balancer" },
  ],
  "onprem_firewall->onprem_load_balancer": [
    { protocol: "tcp", port: 80, source: "0.0.0.0/0", note: "HTTP from internet via firewall" },
    { protocol: "tcp", port: 443, source: "0.0.0.0/0", note: "HTTPS from internet via firewall" },
  ],
  "onprem_vm->onprem_postgres": [
    { protocol: "tcp", port: 5432, source: "app-subnet", note: "PostgreSQL from VM" },
  ],
  "onprem_vm->onprem_mysql": [
    { protocol: "tcp", port: 3306, source: "app-subnet", note: "MySQL from VM" },
  ],
  "onprem_vm->onprem_redis": [
    { protocol: "tcp", port: 6379, source: "app-subnet", note: "Redis from VM" },
  ],
  "onprem_k8s->onprem_postgres": [
    { protocol: "tcp", port: 5432, source: "pod-cidr", note: "PostgreSQL from Kubernetes" },
  ],
  "onprem_k8s->onprem_redis": [
    { protocol: "tcp", port: 6379, source: "pod-cidr", note: "Redis from Kubernetes" },
  ],
  "onprem_bare_metal->onprem_san": [
    { protocol: "tcp", port: 3260, source: "storage-network", note: "iSCSI from bare metal" },
  ],
  "onprem_vm->onprem_nas": [
    { protocol: "tcp", port: 2049, source: "app-subnet", note: "NFS from VM" },
  ],
};

export function getOnpremSuggestedRules(sourceType, targetType) {
  const key = `${sourceType}->${targetType}`;
  return ONPREM_RULE_MATRIX[key] ?? [];
}

export default ONPREM_RULE_MATRIX;
