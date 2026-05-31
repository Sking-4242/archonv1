"""
Extended AWS discovery handlers (Phase 2).

Imported by discover.py after core handlers are defined to avoid circular imports.
"""

from __future__ import annotations

from typing import Any

from archon_cli.discover import DiscoveredResource, _safe, _tag_name


def _discover_transit_gateways(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("ec2", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_transit_gateways")
        for page in paginator.paginate():
            for tgw in page.get("TransitGateways", []):
                tgw_id = tgw["TransitGatewayId"]
                name = _tag_name(tgw.get("Tags")) or tgw_id
                attached_vpcs = [
                    a["ResourceId"]
                    for a in tgw.get("Attachments", [])
                    if a.get("ResourceType") == "vpc" and a.get("ResourceId")
                ]
                resources.append(DiscoveredResource(
                    service="VPC", resource_type="Transit Gateway",
                    resource_id=tgw_id, name=name,
                    region=region, state=tgw.get("State", "available"),
                    canvas_type="transit_gateway",
                    attributes={
                        "amazon_side_asn": tgw.get("Options", {}).get("AmazonSideAsn"),
                        "attached_vpc_ids": attached_vpcs,
                    },
                ))

    _safe(_fetch, "EC2:TransitGateways", errors)
    return resources


def _discover_vpn_gateways(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("ec2", region_name=region)

    def _fetch():
        for vgw in client.describe_vpn_gateways().get("VpnGateways", []):
            vgw_id = vgw["VpnGatewayId"]
            name = _tag_name(vgw.get("Tags")) or vgw_id
            attached_vpcs = [
                a["VpcId"] for a in vgw.get("VpcAttachments", [])
                if a.get("State") == "attached" and a.get("VpcId")
            ]
            resources.append(DiscoveredResource(
                service="VPC", resource_type="VPN Gateway",
                resource_id=vgw_id, name=name,
                region=region, state=vgw.get("State", "available"),
                canvas_type="vpn_gateway",
                attributes={
                    "type": vgw.get("Type"),
                    "attached_vpc_ids": attached_vpcs,
                    "vpc_id": attached_vpcs[0] if attached_vpcs else None,
                },
            ))

    _safe(_fetch, "EC2:VpnGateways", errors)
    return resources


def _discover_direct_connect(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("directconnect", region_name=region)

    def _fetch():
        for conn in client.describe_connections().get("connections", []):
            conn_id = conn["connectionId"]
            name = conn.get("connectionName") or conn_id
            resources.append(DiscoveredResource(
                service="Direct Connect", resource_type="Connection",
                resource_id=conn_id, name=name,
                region=region, state=conn.get("connectionState", "unknown"),
                canvas_type="direct_connect",
                attributes={
                    "bandwidth": conn.get("bandwidth"),
                    "location": conn.get("location"),
                    "partner_name": conn.get("partnerName"),
                    "vlan": conn.get("vlan"),
                },
            ))

    _safe(_fetch, "DirectConnect:Connections", errors)
    return resources


def _discover_global_accelerator(session, region: str, errors: list) -> list[DiscoveredResource]:
    """Global Accelerator API must be called from us-west-2."""
    if region != "us-west-2":
        return []
    resources: list[DiscoveredResource] = []
    client = session.client("globalaccelerator", region_name="us-west-2")

    def _fetch():
        paginator = client.get_paginator("list_accelerators")
        for page in paginator.paginate():
            for accel in page.get("Accelerators", []):
                arn = accel["AcceleratorArn"]
                name = accel.get("Name") or arn.split("/")[-1]
                resources.append(DiscoveredResource(
                    service="Global Accelerator", resource_type="Accelerator",
                    resource_id=arn, name=name,
                    region="global", state=accel.get("Status", "ACTIVE").lower(),
                    canvas_type="global_accelerator",
                    attributes={
                        "dns_name": accel.get("DnsName"),
                        "enabled": accel.get("Enabled", True),
                        "ip_address_type": accel.get("IpAddressType"),
                    },
                ))

    _safe(_fetch, "GlobalAccelerator:Accelerators", errors)
    return resources


def _discover_ecr(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("ecr", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_repositories")
        for page in paginator.paginate():
            for repo in page.get("repositories", []):
                arn = repo["repositoryArn"]
                name = repo.get("repositoryName") or arn
                resources.append(DiscoveredResource(
                    service="ECR", resource_type="Repository",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="ecr",
                    attributes={
                        "uri": repo.get("repositoryUri"),
                        "scan_on_push": repo.get("imageScanningConfiguration", {}).get("scanOnPush"),
                        "encryption_type": (repo.get("encryptionConfiguration") or {}).get("encryptionType"),
                    },
                ))

    _safe(_fetch, "ECR:Repositories", errors)
    return resources


def _discover_app_runner(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("apprunner", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_services")
        for page in paginator.paginate():
            for summary in page.get("ServiceSummaryList", []):
                arn = summary["ServiceArn"]
                name = summary.get("ServiceName") or arn.split("/")[-1]
                resources.append(DiscoveredResource(
                    service="App Runner", resource_type="Service",
                    resource_id=arn, name=name,
                    region=region, state=summary.get("Status", "unknown").lower(),
                    canvas_type="app_runner",
                    attributes={
                        "service_url": summary.get("ServiceUrl"),
                        "created_at": str(summary.get("CreatedAt", "")),
                    },
                ))

    _safe(_fetch, "AppRunner:Services", errors)
    return resources


def _discover_batch(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("batch", region_name=region)

    def _fetch():
        for queue in client.describe_job_queues().get("jobQueues", []):
            arn = queue["jobQueueArn"]
            name = queue.get("jobQueueName") or arn
            resources.append(DiscoveredResource(
                service="Batch", resource_type="Job Queue",
                resource_id=arn, name=name,
                region=region, state=queue.get("status", "unknown").lower(),
                canvas_type="batch",
                attributes={
                    "priority": queue.get("priority"),
                    "state": queue.get("state"),
                    "compute_environment_order": [
                        o.get("computeEnvironment") for o in queue.get("computeEnvironmentOrder", [])
                    ],
                },
            ))

    _safe(_fetch, "Batch:JobQueues", errors)
    return resources


def _discover_elastic_beanstalk(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("elasticbeanstalk", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_environments")
        for page in paginator.paginate():
            for env in page.get("Environments", []):
                env_id = env["EnvironmentId"]
                name = env.get("EnvironmentName") or env_id
                resources.append(DiscoveredResource(
                    service="Elastic Beanstalk", resource_type="Environment",
                    resource_id=env_id, name=name,
                    region=region, state=env.get("Status", "unknown").lower(),
                    canvas_type="elastic_beanstalk",
                    attributes={
                        "application_name": env.get("ApplicationName"),
                        "platform_arn": env.get("PlatformArn"),
                        "endpoint_url": env.get("EndpointURL"),
                        "vpc_id": env.get("VpcId"),
                    },
                ))

    _safe(_fetch, "ElasticBeanstalk:Environments", errors)
    return resources


def _discover_lightsail(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("lightsail", region_name=region)

    def _fetch():
        for inst in client.get_instances().get("instances", []):
            name = inst["name"]
            arn = inst.get("arn", name)
            resources.append(DiscoveredResource(
                service="Lightsail", resource_type="Instance",
                resource_id=arn, name=name,
                region=region, state=inst.get("state", {}).get("name", "unknown").lower(),
                canvas_type="lightsail",
                attributes={
                    "blueprint_id": inst.get("blueprintId"),
                    "bundle_id": inst.get("bundleId"),
                    "public_ip": inst.get("publicIpAddress"),
                    "private_ip": inst.get("privateIpAddress"),
                },
            ))

    _safe(_fetch, "Lightsail:Instances", errors)
    return resources


def _discover_fsx(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("fsx", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_file_systems")
        for page in paginator.paginate():
            for fs in page.get("FileSystems", []):
                fs_id = fs["FileSystemId"]
                name = _tag_name(fs.get("Tags")) or fs_id
                resources.append(DiscoveredResource(
                    service="FSx", resource_type="File System",
                    resource_id=fs_id, name=name,
                    region=region, state=fs.get("Lifecycle", "available").lower(),
                    canvas_type="fsx",
                    attributes={
                        "file_system_type": fs.get("FileSystemType"),
                        "storage_capacity": fs.get("StorageCapacity"),
                        "vpc_id": fs.get("VpcId"),
                        "storage_type": fs.get("StorageType"),
                    },
                ))

    _safe(_fetch, "FSx:FileSystems", errors)
    return resources


def _discover_backup(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("backup", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_backup_vaults")
        for page in paginator.paginate():
            for vault in page.get("BackupVaultList", []):
                name = vault["BackupVaultName"]
                arn = vault.get("BackupVaultArn", name)
                resources.append(DiscoveredResource(
                    service="Backup", resource_type="Backup Vault",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="backup",
                    attributes={
                        "encryption_key_arn": vault.get("EncryptionKeyArn"),
                        "creation_date": str(vault.get("CreationDate", "")),
                    },
                ))

    _safe(_fetch, "Backup:Vaults", errors)
    return resources


def _discover_storage_gateway(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("storagegateway", region_name=region)

    def _fetch():
        for gw in client.list_gateways().get("Gateways", []):
            arn = gw["GatewayARN"]
            name = gw.get("GatewayName") or arn.split("/")[-1]
            resources.append(DiscoveredResource(
                service="Storage Gateway", resource_type="Gateway",
                resource_id=arn, name=name,
                region=region, state="active", canvas_type="storage_gateway",
                attributes={
                    "gateway_type": gw.get("GatewayType"),
                    "ec2_instance_id": gw.get("Ec2InstanceId"),
                },
            ))

    _safe(_fetch, "StorageGateway:Gateways", errors)
    return resources


def _discover_redshift(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("redshift", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_clusters")
        for page in paginator.paginate():
            for cluster in page.get("Clusters", []):
                cid = cluster["ClusterIdentifier"]
                resources.append(DiscoveredResource(
                    service="Redshift", resource_type="Cluster",
                    resource_id=cid, name=cid,
                    region=region, state=cluster.get("ClusterStatus", "unknown"),
                    canvas_type="redshift",
                    attributes={
                        "node_type": cluster.get("NodeType"),
                        "number_of_nodes": cluster.get("NumberOfNodes"),
                        "vpc_id": cluster.get("VpcId"),
                        "encrypted": cluster.get("Encrypted", False),
                    },
                ))

    _safe(_fetch, "Redshift:Clusters", errors)
    return resources


def _discover_documentdb(session, region: str, errors: list) -> list[DiscoveredResource]:
    return _discover_rds_engine_clusters(session, region, errors, "docdb", "DocumentDB", "documentdb")


def _discover_neptune(session, region: str, errors: list) -> list[DiscoveredResource]:
    return _discover_rds_engine_clusters(session, region, errors, "neptune", "Neptune", "neptune")


def _discover_rds_engine_clusters(
    session,
    region: str,
    errors: list,
    engine: str,
    service_label: str,
    canvas_type: str,
) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("rds", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_db_clusters")
        for page in paginator.paginate():
            for cluster in page.get("DBClusters", []):
                if cluster.get("Engine", "").startswith(engine) is False:
                    continue
                arn = cluster["DBClusterArn"]
                name = cluster.get("DBClusterIdentifier") or arn
                resources.append(DiscoveredResource(
                    service=service_label, resource_type="Cluster",
                    resource_id=arn, name=name,
                    region=region, state=cluster.get("Status", "unknown"),
                    canvas_type=canvas_type,
                    attributes={
                        "engine": cluster.get("Engine"),
                        "engine_version": cluster.get("EngineVersion"),
                        "vpc_id": (cluster.get("DBSubnetGroup") or {}).get("VpcId"),
                        "multi_az": cluster.get("MultiAZ", False),
                    },
                ))

    _safe(_fetch, f"RDS:{service_label}Clusters", errors)
    return resources


def _discover_opensearch(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("opensearch", region_name=region)

    def _fetch():
        names = client.list_domain_names().get("DomainNames", [])
        if not names:
            return
        for domain_meta in names:
            domain_name = domain_meta["DomainName"]
            detail = client.describe_domain(DomainName=domain_name).get("DomainStatus", {})
            arn = detail.get("ARN", domain_name)
            resources.append(DiscoveredResource(
                service="OpenSearch", resource_type="Domain",
                resource_id=arn, name=domain_name,
                region=region, state=detail.get("Processing", False) and "processing" or "active",
                canvas_type="opensearch",
                attributes={
                    "engine_version": detail.get("EngineVersion"),
                    "instance_type": (detail.get("ClusterConfig") or {}).get("InstanceType"),
                    "vpc_id": (detail.get("VPCOptions") or {}).get("VPCId"),
                    "endpoint": detail.get("Endpoint") or detail.get("Endpoints", {}).get("vpc"),
                },
            ))

    _safe(_fetch, "OpenSearch:Domains", errors)
    return resources


def _discover_timestream(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("timestream-write", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_databases")
        for page in paginator.paginate():
            for db in page.get("Databases", []):
                name = db["DatabaseName"]
                arn = db.get("Arn", name)
                resources.append(DiscoveredResource(
                    service="Timestream", resource_type="Database",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="timestream",
                    attributes={
                        "table_count": db.get("TableCount"),
                        "creation_time": str(db.get("CreationTime", "")),
                    },
                ))

    _safe(_fetch, "Timestream:Databases", errors)
    return resources


def _discover_acm(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("acm", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_certificates")
        for page in paginator.paginate():
            for cert in page.get("CertificateSummaryList", []):
                arn = cert["CertificateArn"]
                domain = cert.get("DomainName") or arn.split("/")[-1]
                resources.append(DiscoveredResource(
                    service="ACM", resource_type="Certificate",
                    resource_id=arn, name=domain,
                    region=region, state="issued", canvas_type="acm",
                    attributes={
                        "domain_name": cert.get("DomainName"),
                        "status": cert.get("Status"),
                        "type": cert.get("Type"),
                        "in_use": cert.get("InUse", False),
                    },
                ))

    _safe(_fetch, "ACM:Certificates", errors)
    return resources


def _discover_cognito(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("cognito-idp", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_user_pools")
        for page in paginator.paginate(MaxResults=60):
            for pool in page.get("UserPools", []):
                pool_id = pool["Id"]
                name = pool.get("Name") or pool_id
                arn = f"arn:aws:cognito-idp:{region}:{pool_id}"
                resources.append(DiscoveredResource(
                    service="Cognito", resource_type="User Pool",
                    resource_id=pool_id, name=name,
                    region=region, state="active", canvas_type="cognito",
                    attributes={
                        "lambda_config": bool(pool.get("LambdaConfig")),
                        "creation_date": str(pool.get("CreationDate", "")),
                    },
                ))

    _safe(_fetch, "Cognito:UserPools", errors)
    return resources


def _discover_guardduty(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("guardduty", region_name=region)

    def _fetch():
        for detector_id in client.list_detectors().get("DetectorIds", []):
            detail = client.get_detector(DetectorId=detector_id)
            resources.append(DiscoveredResource(
                service="GuardDuty", resource_type="Detector",
                resource_id=detector_id, name=f"GuardDuty ({region})",
                region=region, state=detail.get("Status", "ENABLED").lower(),
                canvas_type="guardduty",
                attributes={
                    "finding_publishing_frequency": detail.get("FindingPublishingFrequency"),
                    "data_sources": list((detail.get("DataSources") or {}).keys()),
                },
            ))

    _safe(_fetch, "GuardDuty:Detectors", errors)
    return resources


def _discover_config(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("config", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_config_rules")
        for page in paginator.paginate():
            for rule in page.get("ConfigRules", []):
                name = rule["ConfigRuleName"]
                arn = rule.get("ConfigRuleArn", name)
                resources.append(DiscoveredResource(
                    service="Config", resource_type="Config Rule",
                    resource_id=arn, name=name,
                    region=region, state=rule.get("ConfigRuleState", "ACTIVE").lower(),
                    canvas_type="config",
                    attributes={
                        "source": (rule.get("Source") or {}).get("Owner"),
                        "description": rule.get("Description", ""),
                    },
                ))

    _safe(_fetch, "Config:Rules", errors)
    return resources


def _discover_step_functions(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("stepfunctions", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_state_machines")
        for page in paginator.paginate():
            for sm in page.get("stateMachines", []):
                arn = sm["stateMachineArn"]
                name = sm.get("name") or arn
                resources.append(DiscoveredResource(
                    service="Step Functions", resource_type="State Machine",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="step_functions",
                    attributes={
                        "type": sm.get("type"),
                        "creation_date": str(sm.get("creationDate", "")),
                    },
                ))

    _safe(_fetch, "StepFunctions:StateMachines", errors)
    return resources


def _discover_kinesis(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    kinesis = session.client("kinesis", region_name=region)

    def _fetch_streams():
        paginator = kinesis.get_paginator("list_streams")
        for page in paginator.paginate():
            for stream_name in page.get("StreamNames", []):
                arn = f"arn:aws:kinesis:{region}::stream/{stream_name}"
                resources.append(DiscoveredResource(
                    service="Kinesis", resource_type="Data Stream",
                    resource_id=arn, name=stream_name,
                    region=region, state="active", canvas_type="kinesis",
                    attributes={"stream_name": stream_name},
                ))

    _safe(_fetch_streams, "Kinesis:Streams", errors)
    return resources


def _discover_kinesis_firehose(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("firehose", region_name=region)

    def _fetch():
        for name in client.list_delivery_streams().get("DeliveryStreamNames", []):
            detail = client.describe_delivery_stream(DeliveryStreamName=name)["DeliveryStreamDescription"]
            arn = detail["DeliveryStreamARN"]
            resources.append(DiscoveredResource(
                service="Kinesis Firehose", resource_type="Delivery Stream",
                resource_id=arn, name=name,
                region=region, state=detail.get("DeliveryStreamStatus", "ACTIVE").lower(),
                canvas_type="kinesis_firehose",
                attributes={
                    "type": detail.get("DeliveryStreamType"),
                    "destination": (detail.get("Destinations") or [{}])[0].get("DestinationId"),
                },
            ))

    _safe(_fetch, "Firehose:DeliveryStreams", errors)
    return resources


def _discover_mq(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("mq", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_brokers")
        for page in paginator.paginate():
            for summary in page.get("BrokerSummaries", []):
                broker_id = summary["BrokerId"]
                name = summary.get("BrokerName") or broker_id
                arn = summary.get("BrokerArn", broker_id)
                resources.append(DiscoveredResource(
                    service="Amazon MQ", resource_type="Broker",
                    resource_id=arn, name=name,
                    region=region, state=summary.get("BrokerState", "unknown").lower(),
                    canvas_type="mq",
                    attributes={
                        "engine_type": summary.get("EngineType"),
                        "host_instance_type": summary.get("HostInstanceType"),
                    },
                ))

    _safe(_fetch, "MQ:Brokers", errors)
    return resources


def _discover_appsync(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("appsync", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_graphql_apis")
        for page in paginator.paginate():
            for api in page.get("graphqlApis", []):
                api_id = api["apiId"]
                name = api.get("name") or api_id
                arn = api.get("arn", api_id)
                resources.append(DiscoveredResource(
                    service="AppSync", resource_type="GraphQL API",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="appsync",
                    attributes={
                        "authentication_type": api.get("authenticationType"),
                        "visibility": api.get("visibility"),
                        "uris": api.get("uris", {}),
                    },
                ))

    _safe(_fetch, "AppSync:GraphQLAPIs", errors)
    return resources


def _discover_glue(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("glue", region_name=region)

    def _fetch():
        paginator = client.get_paginator("get_jobs")
        for page in paginator.paginate():
            for job_name in page.get("Jobs", []):
                job = client.get_job(JobName=job_name).get("Job", {})
                resources.append(DiscoveredResource(
                    service="Glue", resource_type="Job",
                    resource_id=job_name, name=job_name,
                    region=region, state="active", canvas_type="glue",
                    attributes={
                        "role": job.get("Role"),
                        "glue_version": job.get("GlueVersion"),
                        "worker_type": job.get("WorkerType"),
                    },
                ))

    _safe(_fetch, "Glue:Jobs", errors)
    return resources


def _discover_athena(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("athena", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_work_groups")
        for page in paginator.paginate():
            for wg in page.get("WorkGroups", []):
                name = wg["Name"]
                arn = f"arn:aws:athena:{region}::workgroup/{name}"
                resources.append(DiscoveredResource(
                    service="Athena", resource_type="Workgroup",
                    resource_id=arn, name=name,
                    region=region, state=wg.get("State", "ENABLED").lower(),
                    canvas_type="athena",
                    attributes={
                        "description": wg.get("Description", ""),
                        "creation_time": str(wg.get("CreationTime", "")),
                    },
                ))

    _safe(_fetch, "Athena:WorkGroups", errors)
    return resources


def _discover_emr(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("emr", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_clusters")
        for page in paginator.paginate(ClusterStates=["STARTING", "BOOTSTRAPPING", "RUNNING", "WAITING"]):
            for cluster in page.get("Clusters", []):
                cluster_id = cluster["Id"]
                name = cluster.get("Name") or cluster_id
                resources.append(DiscoveredResource(
                    service="EMR", resource_type="Cluster",
                    resource_id=cluster_id, name=name,
                    region=region, state=cluster.get("Status", {}).get("State", "unknown").lower(),
                    canvas_type="emr",
                    attributes={
                        "normalized_instance_hours": cluster.get("NormalizedInstanceHours"),
                        "release_label": cluster.get("ReleaseLabel"),
                    },
                ))

    _safe(_fetch, "EMR:Clusters", errors)
    return resources


def _discover_msk(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("kafka", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_clusters_v2")
        for page in paginator.paginate():
            for summary in page.get("ClusterInfoList", []):
                arn = summary["ClusterArn"]
                name = summary.get("ClusterName") or arn
                resources.append(DiscoveredResource(
                    service="MSK", resource_type="Cluster",
                    resource_id=arn, name=name,
                    region=region, state=summary.get("State", "ACTIVE").lower(),
                    canvas_type="msk",
                    attributes={
                        "kafka_version": (summary.get("CurrentBrokerSoftwareInfo") or {}).get("KafkaVersion"),
                        "number_of_broker_nodes": summary.get("NumberOfBrokerNodes"),
                    },
                ))

    _safe(_fetch, "MSK:Clusters", errors)
    return resources


def _discover_codepipeline(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("codepipeline", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_pipelines")
        for page in paginator.paginate():
            for pipeline in page.get("pipelines", []):
                name = pipeline["name"]
                arn = f"arn:aws:codepipeline:{region}::pipeline/{name}"
                resources.append(DiscoveredResource(
                    service="CodePipeline", resource_type="Pipeline",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="codepipeline",
                    attributes={
                        "created": str(pipeline.get("created", "")),
                        "updated": str(pipeline.get("updated", "")),
                    },
                ))

    _safe(_fetch, "CodePipeline:Pipelines", errors)
    return resources


def _discover_codebuild(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("codebuild", region_name=region)

    def _fetch():
        for name in client.list_projects().get("projects", []):
            arn = f"arn:aws:codebuild:{region}::project/{name}"
            resources.append(DiscoveredResource(
                service="CodeBuild", resource_type="Project",
                resource_id=arn, name=name,
                region=region, state="active", canvas_type="codebuild",
                attributes={},
            ))

    _safe(_fetch, "CodeBuild:Projects", errors)
    return resources


def _discover_codedeploy(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("codedeploy", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_applications")
        for page in paginator.paginate():
            for app_name in page.get("applications", []):
                arn = f"arn:aws:codedeploy:{region}::application:{app_name}"
                resources.append(DiscoveredResource(
                    service="CodeDeploy", resource_type="Application",
                    resource_id=arn, name=app_name,
                    region=region, state="active", canvas_type="codedeploy",
                    attributes={},
                ))

    _safe(_fetch, "CodeDeploy:Applications", errors)
    return resources


def _discover_codecommit(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("codecommit", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_repositories")
        for page in paginator.paginate():
            for repo in page.get("repositories", []):
                name = repo["repositoryName"]
                arn = repo.get("repositoryId", name)
                resources.append(DiscoveredResource(
                    service="CodeCommit", resource_type="Repository",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="codecommit",
                    attributes={
                        "clone_url_http": repo.get("cloneUrlHttp"),
                    },
                ))

    _safe(_fetch, "CodeCommit:Repositories", errors)
    return resources


def _discover_cloudformation(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("cloudformation", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_stacks")
        for page in paginator.paginate(StackStatusFilter=[
            "CREATE_COMPLETE", "UPDATE_COMPLETE", "UPDATE_ROLLBACK_COMPLETE",
            "IMPORT_COMPLETE", "IMPORT_ROLLBACK_COMPLETE",
        ]):
            for stack in page.get("StackSummaries", []):
                stack_id = stack["StackId"]
                name = stack.get("StackName") or stack_id
                resources.append(DiscoveredResource(
                    service="CloudFormation", resource_type="Stack",
                    resource_id=stack_id, name=name,
                    region=region, state=stack.get("StackStatus", "unknown").lower(),
                    canvas_type="cloudformation",
                    attributes={
                        "creation_time": str(stack.get("CreationTime", "")),
                        "template_description": stack.get("TemplateDescription", ""),
                    },
                ))

    _safe(_fetch, "CloudFormation:Stacks", errors)
    return resources


def _discover_systems_manager(session, region: str, errors: list) -> list[DiscoveredResource]:
    """Managed EC2/on-prem instances registered with SSM."""
    resources: list[DiscoveredResource] = []
    client = session.client("ssm", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_instance_information")
        for page in paginator.paginate():
            for info in page.get("InstanceInformationList", []):
                instance_id = info["InstanceId"]
                name = info.get("ComputerName") or instance_id
                resources.append(DiscoveredResource(
                    service="Systems Manager", resource_type="Managed Instance",
                    resource_id=instance_id, name=name,
                    region=region, state="active", canvas_type="systems_manager",
                    attributes={
                        "platform_type": info.get("PlatformType"),
                        "platform_name": info.get("PlatformName"),
                        "agent_version": info.get("AgentVersion"),
                        "ping_status": info.get("PingStatus"),
                    },
                ))

    _safe(_fetch, "SSM:ManagedInstances", errors)
    return resources


def _discover_sagemaker(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("sagemaker", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_endpoints")
        for page in paginator.paginate():
            for summary in page.get("Endpoints", []):
                name = summary["EndpointName"]
                arn = summary.get("EndpointArn", name)
                resources.append(DiscoveredResource(
                    service="SageMaker", resource_type="Endpoint",
                    resource_id=arn, name=name,
                    region=region, state=summary.get("EndpointStatus", "unknown").lower(),
                    canvas_type="sagemaker",
                    attributes={
                        "creation_time": str(summary.get("CreationTime", "")),
                    },
                ))

    _safe(_fetch, "SageMaker:Endpoints", errors)
    return resources


EXTENDED_DISCOVERERS: list[Any] = [
    _discover_transit_gateways,
    _discover_vpn_gateways,
    _discover_direct_connect,
    _discover_global_accelerator,
    _discover_ecr,
    _discover_app_runner,
    _discover_batch,
    _discover_elastic_beanstalk,
    _discover_lightsail,
    _discover_fsx,
    _discover_backup,
    _discover_storage_gateway,
    _discover_redshift,
    _discover_documentdb,
    _discover_neptune,
    _discover_opensearch,
    _discover_timestream,
    _discover_acm,
    _discover_cognito,
    _discover_guardduty,
    _discover_config,
    _discover_step_functions,
    _discover_kinesis,
    _discover_kinesis_firehose,
    _discover_mq,
    _discover_appsync,
    _discover_glue,
    _discover_athena,
    _discover_emr,
    _discover_msk,
    _discover_codepipeline,
    _discover_codebuild,
    _discover_codedeploy,
    _discover_codecommit,
    _discover_cloudformation,
    _discover_systems_manager,
    _discover_sagemaker,
]
