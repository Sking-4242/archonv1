"""Static GCP monthly price estimates (USD). Used when live pricing is unavailable."""

from __future__ import annotations

from app.models.graph import Component

PRICES_AS_OF = "2025-01"

_PRICES: dict[str, float] = {
    # Networking
    "gcp_vpc": 0.0,
    "gcp_subnet": 0.0,
    "gcp_firewall": 0.0,
    "gcp_lb": 18.0,
    "gcp_cdn": 8.0,
    "gcp_dns": 0.2,
    "gcp_nat": 32.0,
    "gcp_vpn": 36.0,
    "gcp_interconnect": 1700.0,
    "gcp_private_sc": 8.0,
    "gcp_network_endpoint_grp": 0.0,
    # Compute
    "gcp_gce": 25.0,
    "gcp_mig": 50.0,
    "gcp_gke": 0.0,
    "gcp_cloud_run": 5.0,
    "gcp_cloud_functions": 2.0,
    "gcp_app_engine": 15.0,
    "gcp_cloud_batch": 0.0,
    "gcp_cloud_composer": 350.0,
    # Storage
    "gcp_gcs": 20.0,
    "gcp_filestore": 200.0,
    "gcp_persistent_disk": 10.0,
    "gcp_backup": 10.0,
    # Database
    "gcp_cloudsql": 50.0,
    "gcp_alloydb": 180.0,
    "gcp_spanner": 65.0,
    "gcp_firestore": 0.0,
    "gcp_bigtable": 65.0,
    "gcp_memorystore": 50.0,
    "gcp_datastore": 0.0,
    # Security
    "gcp_iam": 0.0,
    "gcp_secret_manager": 6.0,
    "gcp_armor": 5.0,
    "gcp_kms": 6.0,
    "gcp_certificate_manager": 8.0,
    "gcp_scc": 0.0,
    # Integration
    "gcp_pubsub": 10.0,
    "gcp_dataflow": 40.0,
    "gcp_apigee": 0.0,
    "gcp_tasks": 3.0,
    "gcp_scheduler": 1.0,
    "gcp_workflows": 1.0,
    # Analytics
    "gcp_bigquery": 0.0,
    "gcp_dataproc": 100.0,
    "gcp_looker": 0.0,
    "gcp_data_catalog": 10.0,
    "gcp_analytics_hub": 0.0,
    # AI / ML
    "gcp_vertex_ai": 0.0,
    "gcp_automl": 0.0,
    "gcp_vision_ai": 5.0,
    "gcp_speech": 5.0,
    "gcp_translation": 10.0,
    "gcp_natural_lang": 5.0,
    # Monitoring
    "gcp_monitoring": 0.0,
    "gcp_logging": 5.0,
    "gcp_trace": 0.0,
    "gcp_error_reporting": 0.0,
    # DevOps
    "gcp_cloud_build": 3.0,
    "gcp_cloud_deploy": 0.0,
    "gcp_artifact_registry": 10.0,
    "gcp_source_repo": 1.0,
}

_NOTES: dict[str, str] = {
    "gcp_gce": "e2-medium estimate",
    "gcp_mig": "2× e2-medium estimate",
    "gcp_gke": "Node VMs billed separately; cluster mgmt fee applies",
    "gcp_cloud_run": "Light usage estimate",
    "gcp_cloudsql": "db-f1-micro estimate",
    "gcp_alloydb": "2 vCPU primary cluster estimate",
    "gcp_spanner": "100 processing units estimate",
    "gcp_firestore": "Free tier for light usage",
    "gcp_bigquery": "On-demand; first 1 TB/mo free",
    "gcp_filestore": "Basic HDD 1 TB estimate",
    "gcp_vpn": "HA VPN with 1 tunnel estimate",
    "gcp_interconnect": "Dedicated 10 Gbps link estimate",
    "gcp_cloud_composer": "Small environment estimate",
    "gcp_cloud_batch": "Compute VMs billed per task",
    "gcp_dataproc": "2× n1-standard-4 worker estimate",
    "gcp_looker": "Contact Google for subscription pricing",
    "gcp_apigee": "Contact Google for subscription pricing",
    "gcp_vertex_ai": "Training and serving billed separately",
    "gcp_automl": "Training billed per node-hour",
    "gcp_scc": "Standard tier free; Premium contact Google",
    "gcp_monitoring": "First 150 MB/mo of custom metrics free",
    "gcp_error_reporting": "Free",
    "gcp_trace": "First 2.5M spans/mo free",
    "gcp_cloud_deploy": "First 3 deploys/mo free",
    "gcp_analytics_hub": "Usage-based pricing",
}


def estimate_gcp_component(component: Component, region: str = "us-central1") -> dict:
    ctype = component.type
    monthly = _PRICES.get(ctype)
    if monthly is None:
        return {
            "component_id": component.id,
            "component_label": component.label,
            "component_type": ctype,
            "description": "GCP resource",
            "monthly_cost": 0.0,
            "note": "No pricing data available",
        }
    return {
        "component_id": component.id,
        "component_label": component.label,
        "component_type": ctype,
        "description": f"GCP {ctype.replace('gcp_', '').replace('_', ' ').title()}",
        "monthly_cost": monthly,
        "note": _NOTES.get(ctype, ""),
    }
