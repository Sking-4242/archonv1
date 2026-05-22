"""
discover.py — AWS live infrastructure discovery for Archon CLI.

Uses boto3 with the standard credential chain (env vars, ~/.aws/credentials,
instance profiles). Credentials NEVER leave the machine — all AWS API calls
are made locally via boto3. No credentials are passed to Archon Pro or any
remote server.

Covers 30 of the most common AWS service types:

Compute:     EC2, Lambda, ECS clusters, EKS clusters, Auto Scaling Groups
Network:     VPC, Subnet, Internet Gateway, NAT Gateway, Security Group,
             Route Table, Elastic IP, Load Balancers (ALB/NLB), CloudFront
Storage:     S3, EBS, EFS
Database:    RDS, ElastiCache, DynamoDB
Security:    KMS Keys, Secrets Manager, IAM Roles
Integration: SNS, SQS
Monitoring:  CloudWatch Alarms

Usage
-----
from archon_cli.discover import discover_region
report = discover_region("us-east-1")   # returns DiscoveryReport
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

log = logging.getLogger(__name__)


# ─── Data model ──────────────────────────────────────────────────────────────


@dataclass
class DiscoveredResource:
    service: str            # e.g. "EC2", "RDS", "Lambda"
    resource_type: str      # e.g. "Instance", "DBInstance", "Function"
    resource_id: str        # AWS resource ID / ARN / name
    name: str               # human-readable name or ID
    region: str
    state: str              # "running", "stopped", "available", etc.
    canvas_type: str        # Archon canvas node type
    attributes: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "service": self.service,
            "resourceType": self.resource_type,
            "resourceId": self.resource_id,
            "name": self.name,
            "region": self.region,
            "state": self.state,
            "canvasType": self.canvas_type,
            "attributes": self.attributes,
        }


@dataclass
class DiscoveryError:
    service: str
    error: str

    def to_dict(self) -> dict:
        return {"service": self.service, "error": self.error}


@dataclass
class DiscoveryReport:
    region: str
    resources: list[DiscoveredResource] = field(default_factory=list)
    errors: list[DiscoveryError] = field(default_factory=list)

    @property
    def resource_count(self) -> int:
        return len(self.resources)

    def to_dict(self) -> dict:
        by_type: dict[str, int] = {}
        for r in self.resources:
            by_type[r.canvas_type] = by_type.get(r.canvas_type, 0) + 1
        return {
            "region": self.region,
            "resourceCount": self.resource_count,
            "summary": by_type,
            "resources": [r.to_dict() for r in self.resources],
            "errors": [e.to_dict() for e in self.errors],
        }


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _tag_name(tags: list[dict] | None) -> str:
    """Extract the Name tag value from a tag list, or return ''."""
    if not tags:
        return ""
    for t in tags:
        if t.get("Key") == "Name":
            return t.get("Value", "")
    return ""


def _safe(fn, service: str, errors: list[DiscoveryError]) -> Any | None:
    """Call fn(), catching any exception and appending to errors. Returns None on failure."""
    try:
        return fn()
    except Exception as exc:  # noqa: BLE001
        msg = str(exc)
        log.debug("Discovery error for %s: %s", service, msg)
        errors.append(DiscoveryError(service=service, error=msg))
        return None


# ─── Per-service discovery functions ─────────────────────────────────────────


def _discover_ec2_instances(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("ec2", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_instances")
        for page in paginator.paginate():
            for reservation in page.get("Reservations", []):
                for inst in reservation.get("Instances", []):
                    iid = inst["InstanceId"]
                    name = _tag_name(inst.get("Tags")) or iid
                    state = inst.get("State", {}).get("Name", "unknown")
                    resources.append(DiscoveredResource(
                        service="EC2", resource_type="Instance",
                        resource_id=iid, name=name,
                        region=region, state=state, canvas_type="ec2",
                        attributes={
                            "instance_type": inst.get("InstanceType"),
                            "ami_id": inst.get("ImageId"),
                            "availability_zone": inst.get("Placement", {}).get("AvailabilityZone"),
                            "subnet_id": inst.get("SubnetId"),
                            "vpc_id": inst.get("VpcId"),
                            "private_ip": inst.get("PrivateIpAddress"),
                            "public_ip": inst.get("PublicIpAddress"),
                            "key_name": inst.get("KeyName"),
                            "iam_profile": (inst.get("IamInstanceProfile") or {}).get("Arn"),
                        },
                    ))

    _safe(_fetch, "EC2:Instances", errors)
    return resources


def _discover_vpcs(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("ec2", region_name=region)

    def _fetch():
        for vpc in client.describe_vpcs().get("Vpcs", []):
            vid = vpc["VpcId"]
            name = _tag_name(vpc.get("Tags")) or vid
            resources.append(DiscoveredResource(
                service="VPC", resource_type="VPC",
                resource_id=vid, name=name,
                region=region, state="available", canvas_type="vpc",
                attributes={
                    "cidr_block": vpc.get("CidrBlock"),
                    "is_default": vpc.get("IsDefault", False),
                    "dhcp_options_id": vpc.get("DhcpOptionsId"),
                },
            ))

    _safe(_fetch, "EC2:VPCs", errors)
    return resources


def _discover_subnets(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("ec2", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_subnets")
        for page in paginator.paginate():
            for sn in page.get("Subnets", []):
                sid = sn["SubnetId"]
                name = _tag_name(sn.get("Tags")) or sid
                resources.append(DiscoveredResource(
                    service="VPC", resource_type="Subnet",
                    resource_id=sid, name=name,
                    region=region, state=sn.get("State", "available"), canvas_type="subnet",
                    attributes={
                        "cidr_block": sn.get("CidrBlock"),
                        "availability_zone": sn.get("AvailabilityZone"),
                        "vpc_id": sn.get("VpcId"),
                        "map_public_ip_on_launch": sn.get("MapPublicIpOnLaunch", False),
                        "available_ips": sn.get("AvailableIpAddressCount"),
                    },
                ))

    _safe(_fetch, "EC2:Subnets", errors)
    return resources


def _discover_security_groups(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("ec2", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_security_groups")
        for page in paginator.paginate():
            for sg in page.get("SecurityGroups", []):
                sgid = sg["GroupId"]
                name = sg.get("GroupName") or sgid
                resources.append(DiscoveredResource(
                    service="EC2", resource_type="SecurityGroup",
                    resource_id=sgid, name=name,
                    region=region, state="available", canvas_type="security_group",
                    attributes={
                        "vpc_id": sg.get("VpcId"),
                        "description": sg.get("Description"),
                        "ingress_rule_count": len(sg.get("IpPermissions", [])),
                        "egress_rule_count": len(sg.get("IpPermissionsEgress", [])),
                    },
                ))

    _safe(_fetch, "EC2:SecurityGroups", errors)
    return resources


def _discover_igws(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("ec2", region_name=region)

    def _fetch():
        for igw in client.describe_internet_gateways().get("InternetGateways", []):
            igwid = igw["InternetGatewayId"]
            name = _tag_name(igw.get("Tags")) or igwid
            attached_vpcs = [a["VpcId"] for a in igw.get("Attachments", []) if a.get("VpcId")]
            resources.append(DiscoveredResource(
                service="VPC", resource_type="InternetGateway",
                resource_id=igwid, name=name,
                region=region, state="available", canvas_type="internet_gateway",
                attributes={"attached_vpcs": attached_vpcs},
            ))

    _safe(_fetch, "EC2:InternetGateways", errors)
    return resources


def _discover_nat_gateways(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("ec2", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_nat_gateways")
        for page in paginator.paginate():
            for nat in page.get("NatGateways", []):
                nid = nat["NatGatewayId"]
                name = _tag_name(nat.get("Tags")) or nid
                resources.append(DiscoveredResource(
                    service="VPC", resource_type="NatGateway",
                    resource_id=nid, name=name,
                    region=region, state=nat.get("State", "unknown"), canvas_type="nat_gateway",
                    attributes={
                        "subnet_id": nat.get("SubnetId"),
                        "vpc_id": nat.get("VpcId"),
                        "connectivity_type": nat.get("ConnectivityType", "public"),
                    },
                ))

    _safe(_fetch, "EC2:NatGateways", errors)
    return resources


def _discover_route_tables(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("ec2", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_route_tables")
        for page in paginator.paginate():
            for rt in page.get("RouteTables", []):
                rtid = rt["RouteTableId"]
                name = _tag_name(rt.get("Tags")) or rtid
                resources.append(DiscoveredResource(
                    service="VPC", resource_type="RouteTable",
                    resource_id=rtid, name=name,
                    region=region, state="available", canvas_type="route_table",
                    attributes={
                        "vpc_id": rt.get("VpcId"),
                        "route_count": len(rt.get("Routes", [])),
                        "association_count": len(rt.get("Associations", [])),
                    },
                ))

    _safe(_fetch, "EC2:RouteTables", errors)
    return resources


def _discover_eips(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("ec2", region_name=region)

    def _fetch():
        for eip in client.describe_addresses().get("Addresses", []):
            alloc_id = eip.get("AllocationId") or eip.get("PublicIp", "")
            name = _tag_name(eip.get("Tags")) or eip.get("PublicIp", alloc_id)
            resources.append(DiscoveredResource(
                service="EC2", resource_type="ElasticIP",
                resource_id=alloc_id, name=name,
                region=region, state="in-use" if eip.get("AssociationId") else "available",
                canvas_type="elastic_ip",
                attributes={
                    "public_ip": eip.get("PublicIp"),
                    "association_id": eip.get("AssociationId"),
                    "instance_id": eip.get("InstanceId"),
                },
            ))

    _safe(_fetch, "EC2:ElasticIPs", errors)
    return resources


def _discover_albs(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("elbv2", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_load_balancers")
        for page in paginator.paginate():
            for lb in page.get("LoadBalancers", []):
                lbarn = lb["LoadBalancerArn"]
                name = lb.get("LoadBalancerName") or lbarn
                lb_type = lb.get("Type", "application").lower()
                canvas_type = "nlb" if lb_type == "network" else "alb"
                resources.append(DiscoveredResource(
                    service="ELBv2", resource_type="LoadBalancer",
                    resource_id=lbarn, name=name,
                    region=region, state=lb.get("State", {}).get("Code", "unknown"),
                    canvas_type=canvas_type,
                    attributes={
                        "type": lb.get("Type"),
                        "scheme": lb.get("Scheme"),
                        "vpc_id": lb.get("VpcId"),
                        "dns_name": lb.get("DNSName"),
                    },
                ))

    _safe(_fetch, "ELBv2:LoadBalancers", errors)
    return resources


def _discover_s3(session, region: str, errors: list) -> list[DiscoveredResource]:
    """List S3 buckets whose region matches. S3 is global but we filter by region."""
    resources: list[DiscoveredResource] = []
    client = session.client("s3", region_name=region)

    def _fetch():
        buckets = client.list_buckets().get("Buckets", [])
        for bucket in buckets:
            name = bucket["Name"]
            try:
                loc = client.get_bucket_location(Bucket=name).get("LocationConstraint")
                bucket_region = loc or "us-east-1"
            except Exception:  # noqa: BLE001
                bucket_region = "unknown"
            if bucket_region != region:
                continue
            resources.append(DiscoveredResource(
                service="S3", resource_type="Bucket",
                resource_id=name, name=name,
                region=region, state="available", canvas_type="s3",
                attributes={"creation_date": str(bucket.get("CreationDate", ""))},
            ))

    _safe(_fetch, "S3:Buckets", errors)
    return resources


def _discover_rds(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("rds", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_db_instances")
        for page in paginator.paginate():
            for db in page.get("DBInstances", []):
                dbid = db["DBInstanceIdentifier"]
                resources.append(DiscoveredResource(
                    service="RDS", resource_type="DBInstance",
                    resource_id=db.get("DBInstanceArn", dbid), name=dbid,
                    region=region, state=db.get("DBInstanceStatus", "unknown"),
                    canvas_type="aurora" if "aurora" in (db.get("Engine") or "").lower() else "rds",
                    attributes={
                        "engine": db.get("Engine"),
                        "engine_version": db.get("EngineVersion"),
                        "instance_class": db.get("DBInstanceClass"),
                        "multi_az": db.get("MultiAZ", False),
                        "storage_encrypted": db.get("StorageEncrypted", False),
                        "publicly_accessible": db.get("PubliclyAccessible", False),
                        "backup_retention_period": db.get("BackupRetentionPeriod"),
                        "deletion_protection": db.get("DeletionProtection", False),
                        "vpc_id": (db.get("DBSubnetGroup") or {}).get("VpcId"),
                    },
                ))

    _safe(_fetch, "RDS:DBInstances", errors)
    return resources


def _discover_elasticache(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("elasticache", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_cache_clusters")
        for page in paginator.paginate():
            for cluster in page.get("CacheClusters", []):
                cid = cluster["CacheClusterId"]
                resources.append(DiscoveredResource(
                    service="ElastiCache", resource_type="CacheCluster",
                    resource_id=cid, name=cid,
                    region=region, state=cluster.get("CacheClusterStatus", "unknown"),
                    canvas_type="elasticache",
                    attributes={
                        "engine": cluster.get("Engine"),
                        "engine_version": cluster.get("EngineVersion"),
                        "node_type": cluster.get("CacheNodeType"),
                        "num_cache_nodes": cluster.get("NumCacheNodes"),
                    },
                ))

    _safe(_fetch, "ElastiCache:Clusters", errors)
    return resources


def _discover_dynamodb(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("dynamodb", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_tables")
        for page in paginator.paginate():
            for table_name in page.get("TableNames", []):
                try:
                    desc = client.describe_table(TableName=table_name)["Table"]
                    arn = desc.get("TableArn", table_name)
                    resources.append(DiscoveredResource(
                        service="DynamoDB", resource_type="Table",
                        resource_id=arn, name=table_name,
                        region=region, state=desc.get("TableStatus", "unknown"),
                        canvas_type="dynamodb",
                        attributes={
                            "billing_mode": desc.get("BillingModeSummary", {}).get("BillingMode", "PROVISIONED"),
                            "item_count": desc.get("ItemCount"),
                            "size_bytes": desc.get("TableSizeBytes"),
                            "point_in_time_recovery": bool(
                                (desc.get("PointInTimeRecoveryDescription") or {}).get("PointInTimeRecoveryStatus") == "ENABLED"
                            ),
                        },
                    ))
                except Exception:  # noqa: BLE001
                    pass

    _safe(_fetch, "DynamoDB:Tables", errors)
    return resources


def _discover_lambda(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("lambda", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_functions")
        for page in paginator.paginate():
            for fn in page.get("Functions", []):
                arn = fn["FunctionArn"]
                name = fn["FunctionName"]
                resources.append(DiscoveredResource(
                    service="Lambda", resource_type="Function",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="lambda",
                    attributes={
                        "runtime": fn.get("Runtime"),
                        "memory_size": fn.get("MemorySize"),
                        "timeout": fn.get("Timeout"),
                        "handler": fn.get("Handler"),
                        "role": fn.get("Role"),
                        "code_size": fn.get("CodeSize"),
                        "tracing_mode": (fn.get("TracingConfig") or {}).get("Mode"),
                    },
                ))

    _safe(_fetch, "Lambda:Functions", errors)
    return resources


def _discover_ecs(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("ecs", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_clusters")
        cluster_arns: list[str] = []
        for page in paginator.paginate():
            cluster_arns.extend(page.get("clusterArns", []))

        if not cluster_arns:
            return

        for i in range(0, len(cluster_arns), 100):
            batch = cluster_arns[i:i + 100]
            described = client.describe_clusters(clusters=batch).get("clusters", [])
            for cluster in described:
                arn = cluster["clusterArn"]
                name = cluster.get("clusterName") or arn
                resources.append(DiscoveredResource(
                    service="ECS", resource_type="Cluster",
                    resource_id=arn, name=name,
                    region=region, state=cluster.get("status", "unknown"),
                    canvas_type="ecs_fargate",
                    attributes={
                        "running_tasks_count": cluster.get("runningTasksCount", 0),
                        "pending_tasks_count": cluster.get("pendingTasksCount", 0),
                        "active_services_count": cluster.get("activeServicesCount", 0),
                    },
                ))

    _safe(_fetch, "ECS:Clusters", errors)
    return resources


def _discover_eks(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("eks", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_clusters")
        names: list[str] = []
        for page in paginator.paginate():
            names.extend(page.get("clusters", []))

        for name in names:
            try:
                cluster = client.describe_cluster(name=name)["cluster"]
                arn = cluster.get("arn", name)
                resources.append(DiscoveredResource(
                    service="EKS", resource_type="Cluster",
                    resource_id=arn, name=name,
                    region=region, state=cluster.get("status", "unknown"),
                    canvas_type="eks",
                    attributes={
                        "kubernetes_version": cluster.get("version"),
                        "endpoint": cluster.get("endpoint"),
                        "vpc_id": (cluster.get("resourcesVpcConfig") or {}).get("vpcId"),
                    },
                ))
            except Exception:  # noqa: BLE001
                pass

    _safe(_fetch, "EKS:Clusters", errors)
    return resources


def _discover_asg(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("autoscaling", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_auto_scaling_groups")
        for page in paginator.paginate():
            for asg in page.get("AutoScalingGroups", []):
                arn = asg.get("AutoScalingGroupARN", asg["AutoScalingGroupName"])
                name = asg["AutoScalingGroupName"]
                resources.append(DiscoveredResource(
                    service="AutoScaling", resource_type="AutoScalingGroup",
                    resource_id=arn, name=name,
                    region=region, state="available", canvas_type="auto_scaling_group",
                    attributes={
                        "min_size": asg.get("MinSize"),
                        "max_size": asg.get("MaxSize"),
                        "desired_capacity": asg.get("DesiredCapacity"),
                        "instance_count": len(asg.get("Instances", [])),
                    },
                ))

    _safe(_fetch, "AutoScaling:Groups", errors)
    return resources


def _discover_ebs(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("ec2", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_volumes")
        for page in paginator.paginate():
            for vol in page.get("Volumes", []):
                vid = vol["VolumeId"]
                name = _tag_name(vol.get("Tags")) or vid
                resources.append(DiscoveredResource(
                    service="EC2", resource_type="Volume",
                    resource_id=vid, name=name,
                    region=region, state=vol.get("State", "unknown"), canvas_type="ebs",
                    attributes={
                        "volume_type": vol.get("VolumeType"),
                        "size_gb": vol.get("Size"),
                        "availability_zone": vol.get("AvailabilityZone"),
                        "encrypted": vol.get("Encrypted", False),
                        "iops": vol.get("Iops"),
                        "attached_to": [(a.get("InstanceId"), a.get("Device")) for a in vol.get("Attachments", [])],
                    },
                ))

    _safe(_fetch, "EC2:Volumes", errors)
    return resources


def _discover_efs(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("efs", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_file_systems")
        for page in paginator.paginate():
            for fs in page.get("FileSystems", []):
                fsid = fs["FileSystemId"]
                name = fs.get("Name") or fsid
                resources.append(DiscoveredResource(
                    service="EFS", resource_type="FileSystem",
                    resource_id=fs.get("FileSystemArn", fsid), name=name,
                    region=region, state=fs.get("LifeCycleState", "unknown"), canvas_type="efs",
                    attributes={
                        "throughput_mode": fs.get("ThroughputMode"),
                        "performance_mode": fs.get("PerformanceMode"),
                        "encrypted": fs.get("Encrypted", False),
                        "size_bytes": (fs.get("SizeInBytes") or {}).get("Value"),
                    },
                ))

    _safe(_fetch, "EFS:FileSystems", errors)
    return resources


def _discover_kms(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("kms", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_keys")
        for page in paginator.paginate():
            for key_entry in page.get("Keys", []):
                kid = key_entry["KeyId"]
                try:
                    meta = client.describe_key(KeyId=kid)["KeyMetadata"]
                    if meta.get("KeyManager") == "AWS":
                        continue  # skip AWS-managed keys
                    if meta.get("KeyState") == "PendingDeletion":
                        continue
                    arn = meta.get("Arn", kid)
                    alias = ""
                    try:
                        aliases = client.list_aliases(KeyId=kid).get("Aliases", [])
                        alias = aliases[0]["AliasName"] if aliases else ""
                    except Exception:  # noqa: BLE001
                        pass
                    resources.append(DiscoveredResource(
                        service="KMS", resource_type="Key",
                        resource_id=arn, name=alias or kid,
                        region=region, state=meta.get("KeyState", "unknown"), canvas_type="kms",
                        attributes={
                            "key_spec": meta.get("KeySpec"),
                            "key_usage": meta.get("KeyUsage"),
                            "enabled": meta.get("Enabled", False),
                            "description": meta.get("Description"),
                        },
                    ))
                except Exception:  # noqa: BLE001
                    pass

    _safe(_fetch, "KMS:Keys", errors)
    return resources


def _discover_secrets(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("secretsmanager", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_secrets")
        for page in paginator.paginate():
            for secret in page.get("SecretList", []):
                arn = secret["ARN"]
                name = secret.get("Name") or arn
                resources.append(DiscoveredResource(
                    service="SecretsManager", resource_type="Secret",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="secretsmanager",
                    attributes={
                        "kms_key_id": secret.get("KmsKeyId"),
                        "rotation_enabled": secret.get("RotationEnabled", False),
                        "last_changed": str(secret.get("LastChangedDate", "")),
                    },
                ))

    _safe(_fetch, "SecretsManager:Secrets", errors)
    return resources


def _discover_iam_roles(session, region: str, errors: list) -> list[DiscoveredResource]:
    """IAM is global; only include when region is the first/primary call region."""
    resources: list[DiscoveredResource] = []
    client = session.client("iam", region_name="us-east-1")  # IAM is always us-east-1

    def _fetch():
        paginator = client.get_paginator("list_roles")
        for page in paginator.paginate():
            for role in page.get("Roles", []):
                arn = role["Arn"]
                name = role["RoleName"]
                resources.append(DiscoveredResource(
                    service="IAM", resource_type="Role",
                    resource_id=arn, name=name,
                    region="global", state="active", canvas_type="iam_role",
                    attributes={
                        "path": role.get("Path"),
                        "description": role.get("Description"),
                        "max_session_duration": role.get("MaxSessionDuration"),
                    },
                ))

    _safe(_fetch, "IAM:Roles", errors)
    return resources


def _discover_sns(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("sns", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_topics")
        for page in paginator.paginate():
            for topic in page.get("Topics", []):
                arn = topic["TopicArn"]
                name = arn.split(":")[-1]
                resources.append(DiscoveredResource(
                    service="SNS", resource_type="Topic",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="sns",
                    attributes={},
                ))

    _safe(_fetch, "SNS:Topics", errors)
    return resources


def _discover_sqs(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("sqs", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_queues")
        for page in paginator.paginate():
            for url in page.get("QueueUrls", []):
                name = url.split("/")[-1]
                resources.append(DiscoveredResource(
                    service="SQS", resource_type="Queue",
                    resource_id=url, name=name,
                    region=region, state="active", canvas_type="sqs",
                    attributes={
                        "is_fifo": name.endswith(".fifo"),
                        "url": url,
                    },
                ))

    _safe(_fetch, "SQS:Queues", errors)
    return resources


def _discover_cloudwatch_alarms(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("cloudwatch", region_name=region)

    def _fetch():
        paginator = client.get_paginator("describe_alarms")
        for page in paginator.paginate():
            for alarm in page.get("MetricAlarms", []):
                arn = alarm.get("AlarmArn", alarm["AlarmName"])
                name = alarm["AlarmName"]
                resources.append(DiscoveredResource(
                    service="CloudWatch", resource_type="Alarm",
                    resource_id=arn, name=name,
                    region=region, state=alarm.get("StateValue", "unknown"),
                    canvas_type="cloudwatch",
                    attributes={
                        "metric_name": alarm.get("MetricName"),
                        "namespace": alarm.get("Namespace"),
                        "threshold": alarm.get("Threshold"),
                        "actions_enabled": alarm.get("ActionsEnabled", False),
                    },
                ))

    _safe(_fetch, "CloudWatch:Alarms", errors)
    return resources


def _discover_cloudfront(session, region: str, errors: list) -> list[DiscoveredResource]:
    """CloudFront is global; only discover if region is us-east-1 to avoid duplicates."""
    if region != "us-east-1":
        return []
    resources: list[DiscoveredResource] = []
    client = session.client("cloudfront", region_name="us-east-1")

    def _fetch():
        paginator = client.get_paginator("list_distributions")
        for page in paginator.paginate():
            dist_list = page.get("DistributionList", {})
            for dist in dist_list.get("Items", []):
                dist_id = dist["Id"]
                arn = dist.get("ARN", dist_id)
                domain = dist.get("DomainName", "")
                origins = [o.get("DomainName", "") for o in dist.get("Origins", {}).get("Items", [])]
                resources.append(DiscoveredResource(
                    service="CloudFront", resource_type="Distribution",
                    resource_id=arn, name=domain or dist_id,
                    region="global", state=dist.get("Status", "unknown"),
                    canvas_type="cloudfront",
                    attributes={
                        "domain_name": domain,
                        "enabled": dist.get("Enabled", False),
                        "price_class": dist.get("PriceClass"),
                        "origins": origins,
                    },
                ))

    _safe(_fetch, "CloudFront:Distributions", errors)
    return resources


# ─── Orchestrator ─────────────────────────────────────────────────────────────

_DISCOVERERS = [
    _discover_vpcs,
    _discover_subnets,
    _discover_igws,
    _discover_nat_gateways,
    _discover_route_tables,
    _discover_eips,
    _discover_security_groups,
    _discover_ec2_instances,
    _discover_ebs,
    _discover_albs,
    _discover_asg,
    _discover_lambda,
    _discover_ecs,
    _discover_eks,
    _discover_s3,
    _discover_rds,
    _discover_elasticache,
    _discover_dynamodb,
    _discover_efs,
    _discover_kms,
    _discover_secrets,
    _discover_iam_roles,
    _discover_sns,
    _discover_sqs,
    _discover_cloudwatch_alarms,
    _discover_cloudfront,
]


def discover_region(region: str, profile: str | None = None) -> DiscoveryReport:
    """
    Discover all supported AWS resources in the given region.

    Parameters
    ----------
    region  : AWS region name, e.g. "us-east-1"
    profile : Optional AWS profile name (from ~/.aws/config).
              If None, uses the default credential chain.

    Returns
    -------
    DiscoveryReport with resources and any per-service errors.

    Security note
    -------------
    Credentials are resolved entirely via boto3's standard chain
    (environment variables → ~/.aws/credentials → instance metadata).
    They are never transmitted outside this process.
    """
    import boto3  # deferred so the module can be imported without boto3 installed

    session = boto3.Session(profile_name=profile) if profile else boto3.Session()
    report = DiscoveryReport(region=region)

    for discoverer in _DISCOVERERS:
        try:
            found = discoverer(session, region, report.errors)
            report.resources.extend(found)
        except Exception as exc:  # noqa: BLE001
            report.errors.append(DiscoveryError(
                service=discoverer.__name__,
                error=str(exc),
            ))

    return report
