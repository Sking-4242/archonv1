const AZURE_RULE_MATRIX = {
  // ── App Gateway → Compute ─────────────────────────────────────────────────
  "azure_agw->azure_vm": [
    { protocol: "tcp", port: 80, source: "agw-subnet", note: "HTTP from App Gateway" },
    { protocol: "tcp", port: 443, source: "agw-subnet", note: "HTTPS from App Gateway" },
    { protocol: "tcp", port: 8080, source: "agw-subnet", note: "Alt HTTP from App Gateway" },
  ],
  "azure_agw->azure_vmss": [
    { protocol: "tcp", port: 80, source: "agw-subnet", note: "HTTP from App Gateway" },
    { protocol: "tcp", port: 443, source: "agw-subnet", note: "HTTPS from App Gateway" },
  ],
  "azure_agw->azure_aks": [
    { protocol: "tcp", port: 80, source: "agw-subnet", note: "HTTP from App Gateway to AKS ingress" },
    { protocol: "tcp", port: 443, source: "agw-subnet", note: "HTTPS from App Gateway to AKS ingress" },
  ],
  "azure_agw->azure_app_service": [
    { protocol: "tcp", port: 443, source: "agw-subnet", note: "HTTPS from App Gateway to App Service" },
  ],
  "azure_agw->azure_functions": [
    { protocol: "tcp", port: 443, source: "agw-subnet", note: "HTTPS from App Gateway to Functions" },
  ],

  // ── Load Balancer → Compute ───────────────────────────────────────────────
  "azure_lb->azure_vm": [
    { protocol: "tcp", port: 80, source: "0.0.0.0/0", note: "HTTP via Load Balancer" },
    { protocol: "tcp", port: 443, source: "0.0.0.0/0", note: "HTTPS via Load Balancer" },
  ],
  "azure_lb->azure_vmss": [
    { protocol: "tcp", port: 80, source: "0.0.0.0/0", note: "HTTP via Load Balancer" },
    { protocol: "tcp", port: 443, source: "0.0.0.0/0", note: "HTTPS via Load Balancer" },
  ],
  "azure_lb->azure_aks": [
    { protocol: "tcp", port: 443, source: "0.0.0.0/0", note: "HTTPS via Load Balancer to AKS" },
  ],

  // ── Front Door → Compute ──────────────────────────────────────────────────
  "azure_frontdoor->azure_app_service": [
    { protocol: "tcp", port: 443, source: "AzureFrontDoor.Backend", note: "HTTPS from Front Door" },
  ],
  "azure_frontdoor->azure_aks": [
    { protocol: "tcp", port: 443, source: "AzureFrontDoor.Backend", note: "HTTPS from Front Door to AKS" },
  ],
  "azure_frontdoor->azure_functions": [
    { protocol: "tcp", port: 443, source: "AzureFrontDoor.Backend", note: "HTTPS from Front Door to Functions" },
  ],
  "azure_frontdoor->azure_vm": [
    { protocol: "tcp", port: 443, source: "AzureFrontDoor.Backend", note: "HTTPS from Front Door to VM" },
  ],

  // ── APIM → Backends ───────────────────────────────────────────────────────
  "azure_apim->azure_functions": [
    { protocol: "tcp", port: 443, source: "apim-subnet", note: "HTTPS from APIM to Functions backend" },
  ],
  "azure_apim->azure_app_service": [
    { protocol: "tcp", port: 443, source: "apim-subnet", note: "HTTPS from APIM to App Service backend" },
  ],
  "azure_apim->azure_aks": [
    { protocol: "tcp", port: 443, source: "apim-subnet", note: "HTTPS from APIM to AKS backend" },
  ],

  // ── VM → Databases ────────────────────────────────────────────────────────
  "azure_vm->azure_sql": [
    { protocol: "tcp", port: 1433, source: "vm-subnet", note: "SQL Server from VM" },
  ],
  "azure_vm->azure_postgres": [
    { protocol: "tcp", port: 5432, source: "vm-subnet", note: "PostgreSQL from VM" },
  ],
  "azure_vm->azure_mysql": [
    { protocol: "tcp", port: 3306, source: "vm-subnet", note: "MySQL from VM" },
  ],
  "azure_vm->azure_mariadb": [
    { protocol: "tcp", port: 3306, source: "vm-subnet", note: "MariaDB from VM" },
  ],
  "azure_vm->azure_redis": [
    { protocol: "tcp", port: 6380, source: "vm-subnet", note: "Redis SSL from VM" },
  ],
  "azure_vm->azure_cosmosdb": [
    { protocol: "tcp", port: 443, source: "vm-subnet", note: "Cosmos DB HTTPS from VM" },
  ],
  "azure_vm->azure_blob": [
    { protocol: "tcp", port: 443, source: "vm-subnet", note: "Azure Storage HTTPS from VM" },
  ],
  "azure_vm->azure_keyvault": [
    { protocol: "tcp", port: 443, source: "vm-subnet", note: "Key Vault HTTPS from VM" },
  ],
  "azure_vm->azure_servicebus": [
    { protocol: "tcp", port: 5671, source: "vm-subnet", note: "Service Bus AMQPS from VM" },
    { protocol: "tcp", port: 443, source: "vm-subnet", note: "Service Bus HTTPS from VM" },
  ],
  "azure_vm->azure_eventhub": [
    { protocol: "tcp", port: 5671, source: "vm-subnet", note: "Event Hub AMQPS from VM" },
    { protocol: "tcp", port: 443, source: "vm-subnet", note: "Event Hub HTTPS from VM" },
  ],

  // ── AKS → Databases & Services ───────────────────────────────────────────
  "azure_aks->azure_sql": [
    { protocol: "tcp", port: 1433, source: "aks-subnet", note: "SQL from AKS" },
  ],
  "azure_aks->azure_postgres": [
    { protocol: "tcp", port: 5432, source: "aks-subnet", note: "PostgreSQL from AKS" },
  ],
  "azure_aks->azure_mysql": [
    { protocol: "tcp", port: 3306, source: "aks-subnet", note: "MySQL from AKS" },
  ],
  "azure_aks->azure_redis": [
    { protocol: "tcp", port: 6380, source: "aks-subnet", note: "Redis SSL from AKS" },
  ],
  "azure_aks->azure_cosmosdb": [
    { protocol: "tcp", port: 443, source: "aks-subnet", note: "Cosmos DB HTTPS from AKS" },
  ],
  "azure_aks->azure_blob": [
    { protocol: "tcp", port: 443, source: "aks-subnet", note: "Azure Storage HTTPS from AKS" },
  ],
  "azure_aks->azure_keyvault": [
    { protocol: "tcp", port: 443, source: "aks-subnet", note: "Key Vault HTTPS from AKS" },
  ],
  "azure_aks->azure_eventhub": [
    { protocol: "tcp", port: 5671, source: "aks-subnet", note: "Event Hub AMQPS from AKS" },
  ],
  "azure_aks->azure_servicebus": [
    { protocol: "tcp", port: 5671, source: "aks-subnet", note: "Service Bus AMQPS from AKS" },
  ],

  // ── Functions → Backends ──────────────────────────────────────────────────
  "azure_functions->azure_sql": [
    { protocol: "tcp", port: 1433, source: "functions-subnet", note: "SQL from Functions" },
  ],
  "azure_functions->azure_postgres": [
    { protocol: "tcp", port: 5432, source: "functions-subnet", note: "PostgreSQL from Functions" },
  ],
  "azure_functions->azure_mysql": [
    { protocol: "tcp", port: 3306, source: "functions-subnet", note: "MySQL from Functions" },
  ],
  "azure_functions->azure_redis": [
    { protocol: "tcp", port: 6380, source: "functions-subnet", note: "Redis SSL from Functions" },
  ],
  "azure_functions->azure_cosmosdb": [
    { protocol: "tcp", port: 443, source: "functions-subnet", note: "Cosmos DB HTTPS from Functions" },
  ],
  "azure_functions->azure_blob": [
    { protocol: "tcp", port: 443, source: "functions-subnet", note: "Storage HTTPS from Functions" },
  ],
  "azure_functions->azure_keyvault": [
    { protocol: "tcp", port: 443, source: "functions-subnet", note: "Key Vault HTTPS from Functions" },
  ],
  "azure_functions->azure_eventhub": [
    { protocol: "tcp", port: 5671, source: "functions-subnet", note: "Event Hub AMQPS from Functions" },
  ],
  "azure_functions->azure_servicebus": [
    { protocol: "tcp", port: 5671, source: "functions-subnet", note: "Service Bus AMQPS from Functions" },
  ],

  // ── App Service → Backends ────────────────────────────────────────────────
  "azure_app_service->azure_sql": [
    { protocol: "tcp", port: 1433, source: "app-service-subnet", note: "SQL from App Service" },
  ],
  "azure_app_service->azure_postgres": [
    { protocol: "tcp", port: 5432, source: "app-service-subnet", note: "PostgreSQL from App Service" },
  ],
  "azure_app_service->azure_redis": [
    { protocol: "tcp", port: 6380, source: "app-service-subnet", note: "Redis SSL from App Service" },
  ],
  "azure_app_service->azure_blob": [
    { protocol: "tcp", port: 443, source: "app-service-subnet", note: "Storage HTTPS from App Service" },
  ],
  "azure_app_service->azure_keyvault": [
    { protocol: "tcp", port: 443, source: "app-service-subnet", note: "Key Vault HTTPS from App Service" },
  ],
  "azure_app_service->azure_servicebus": [
    { protocol: "tcp", port: 5671, source: "app-service-subnet", note: "Service Bus AMQPS from App Service" },
  ],

  // ── VMSS → Databases ──────────────────────────────────────────────────────
  "azure_vmss->azure_sql": [
    { protocol: "tcp", port: 1433, source: "vmss-subnet", note: "SQL from VMSS" },
  ],
  "azure_vmss->azure_redis": [
    { protocol: "tcp", port: 6380, source: "vmss-subnet", note: "Redis SSL from VMSS" },
  ],
  "azure_vmss->azure_blob": [
    { protocol: "tcp", port: 443, source: "vmss-subnet", note: "Storage HTTPS from VMSS" },
  ],

  // ── Container Apps → Backends ─────────────────────────────────────────────
  "azure_container_apps->azure_sql": [
    { protocol: "tcp", port: 1433, source: "container-apps-subnet", note: "SQL from Container Apps" },
  ],
  "azure_container_apps->azure_postgres": [
    { protocol: "tcp", port: 5432, source: "container-apps-subnet", note: "PostgreSQL from Container Apps" },
  ],
  "azure_container_apps->azure_redis": [
    { protocol: "tcp", port: 6380, source: "container-apps-subnet", note: "Redis SSL from Container Apps" },
  ],
  "azure_container_apps->azure_blob": [
    { protocol: "tcp", port: 443, source: "container-apps-subnet", note: "Storage HTTPS from Container Apps" },
  ],
  "azure_container_apps->azure_keyvault": [
    { protocol: "tcp", port: 443, source: "container-apps-subnet", note: "Key Vault HTTPS from Container Apps" },
  ],

  // ── Managed Instance ──────────────────────────────────────────────────────
  "azure_vm->azure_managed_instance": [
    { protocol: "tcp", port: 1433, source: "vm-subnet", note: "Managed Instance SQL from VM" },
  ],
  "azure_aks->azure_managed_instance": [
    { protocol: "tcp", port: 1433, source: "aks-subnet", note: "Managed Instance SQL from AKS" },
  ],
};

export function getAzureSuggestedRules(sourceType, targetType) {
  const key = `${sourceType}->${targetType}`;
  return AZURE_RULE_MATRIX[key] ?? [];
}

export default AZURE_RULE_MATRIX;
