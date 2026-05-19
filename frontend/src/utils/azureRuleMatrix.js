const AZURE_RULE_MATRIX = {
  "azure_agw->azure_vm": [
    { protocol: "tcp", port: 80, source: "agw-subnet", note: "HTTP from App Gateway" },
    { protocol: "tcp", port: 443, source: "agw-subnet", note: "HTTPS from App Gateway" },
    { protocol: "tcp", port: 8080, source: "agw-subnet", note: "Alt HTTP from App Gateway" },
  ],
  "azure_agw->azure_vmss": [
    { protocol: "tcp", port: 80, source: "agw-subnet", note: "HTTP from App Gateway" },
    { protocol: "tcp", port: 443, source: "agw-subnet", note: "HTTPS from App Gateway" },
  ],
  "azure_lb->azure_vm": [
    { protocol: "tcp", port: 80, source: "0.0.0.0/0", note: "HTTP via Load Balancer" },
    { protocol: "tcp", port: 443, source: "0.0.0.0/0", note: "HTTPS via Load Balancer" },
  ],
  "azure_lb->azure_vmss": [
    { protocol: "tcp", port: 80, source: "0.0.0.0/0", note: "HTTP via Load Balancer" },
    { protocol: "tcp", port: 443, source: "0.0.0.0/0", note: "HTTPS via Load Balancer" },
  ],
  "azure_vm->azure_sql": [
    { protocol: "tcp", port: 1433, source: "vm-subnet", note: "SQL Server from VM" },
  ],
  "azure_vm->azure_postgres": [
    { protocol: "tcp", port: 5432, source: "vm-subnet", note: "PostgreSQL from VM" },
  ],
  "azure_vm->azure_redis": [
    { protocol: "tcp", port: 6380, source: "vm-subnet", note: "Redis SSL from VM" },
  ],
  "azure_vm->azure_cosmosdb": [
    { protocol: "tcp", port: 443, source: "vm-subnet", note: "Cosmos DB HTTPS from VM" },
  ],
  "azure_aks->azure_sql": [
    { protocol: "tcp", port: 1433, source: "aks-subnet", note: "SQL from AKS" },
  ],
  "azure_aks->azure_redis": [
    { protocol: "tcp", port: 6380, source: "aks-subnet", note: "Redis from AKS" },
  ],
  "azure_functions->azure_sql": [
    { protocol: "tcp", port: 1433, source: "functions-subnet", note: "SQL from Functions" },
  ],
  "azure_functions->azure_blob": [
    { protocol: "tcp", port: 443, source: "functions-subnet", note: "Storage HTTPS from Functions" },
  ],
};

export function getAzureSuggestedRules(sourceType, targetType) {
  const key = `${sourceType}->${targetType}`;
  return AZURE_RULE_MATRIX[key] ?? [];
}

export default AZURE_RULE_MATRIX;
