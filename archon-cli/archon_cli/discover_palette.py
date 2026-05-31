"""
Final palette discovery handlers — AI/ML, analytics, and security services
without handlers in discover.py / discover_extended.py.
"""

from __future__ import annotations

from typing import Any

from archon_cli.discover import DiscoveredResource, _safe


def _account_id(session) -> str:
    return session.client("sts").get_caller_identity()["Account"]


def _discover_s3_glacier(session, region: str, errors: list) -> list[DiscoveredResource]:
    """Glacier vaults and S3 buckets with Glacier lifecycle transitions."""
    resources: list[DiscoveredResource] = []
    glacier = session.client("glacier", region_name=region)
    s3 = session.client("s3", region_name=region)
    seen: set[str] = set()

    def _fetch_vaults():
        paginator = glacier.get_paginator("list_vaults")
        for page in paginator.paginate():
            for vault in page.get("VaultList", []):
                arn = vault["VaultARN"]
                name = vault.get("VaultName") or arn.split("/")[-1]
                seen.add(arn)
                resources.append(DiscoveredResource(
                    service="S3 Glacier", resource_type="Vault",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="s3_glacier",
                    attributes={
                        "creation_date": str(vault.get("CreationDate", "")),
                        "size_in_bytes": vault.get("SizeInBytes"),
                    },
                ))

    def _fetch_lifecycle_buckets():
        for bucket in s3.list_buckets().get("Buckets", []):
            name = bucket["Name"]
            try:
                loc = s3.get_bucket_location(Bucket=name).get("LocationConstraint")
                bucket_region = loc or "us-east-1"
            except Exception:  # noqa: BLE001
                continue
            if bucket_region != region:
                continue
            try:
                lc = s3.get_bucket_lifecycle_configuration(Bucket=name)
            except Exception:  # noqa: BLE001
                continue
            glacier_classes = {"GLACIER", "DEEP_ARCHIVE", "GLACIER_IR"}
            has_glacier = False
            for rule in lc.get("Rules", []):
                transitions = (
                    rule.get("Transitions", [])
                    + rule.get("NoncurrentVersionTransitions", [])
                )
                if any(t.get("StorageClass") in glacier_classes for t in transitions):
                    has_glacier = True
                    break
            if not has_glacier:
                continue
            rid = f"glacier-lifecycle:{name}"
            if rid in seen:
                continue
            seen.add(rid)
            resources.append(DiscoveredResource(
                service="S3 Glacier", resource_type="Lifecycle Bucket",
                resource_id=rid, name=name,
                region=region, state="active", canvas_type="s3_glacier",
                attributes={"bucket_name": name, "source": "lifecycle"},
            ))

    _safe(_fetch_vaults, "Glacier:Vaults", errors)
    _safe(_fetch_lifecycle_buckets, "S3:GlacierLifecycle", errors)
    return resources


def _discover_inspector(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("inspector2", region_name=region)

    def _fetch():
        account = _account_id(session)
        status = client.batch_get_account_status(accountIds=[account])
        for acct in status.get("accounts", []):
            if acct.get("state") != "ENABLED":
                continue
            rid = f"inspector2:{region}:{account}"
            resources.append(DiscoveredResource(
                service="Inspector", resource_type="Account Coverage",
                resource_id=rid, name=f"Inspector V2 ({region})",
                region=region, state="enabled", canvas_type="inspector",
                attributes={
                    "resource_state": acct.get("resourceState"),
                },
            ))

    _safe(_fetch, "Inspector2:AccountStatus", errors)
    return resources


def _discover_security_hub(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("securityhub", region_name=region)

    def _fetch():
        hub = client.describe_hub()
        arn = hub.get("HubArn", f"securityhub:{region}")
        resources.append(DiscoveredResource(
            service="Security Hub", resource_type="Hub",
            resource_id=arn, name=f"Security Hub ({region})",
            region=region, state="active", canvas_type="security_hub",
            attributes={
                "subscribed_at": str(hub.get("SubscribedAt", "")),
                "auto_enable_controls": hub.get("AutoEnableControls"),
            },
        ))

    _safe(_fetch, "SecurityHub:Hub", errors)
    return resources


def _discover_shield(session, region: str, errors: list) -> list[DiscoveredResource]:
    """Shield Advanced subscription API is in us-east-1."""
    if region != "us-east-1":
        return []
    resources: list[DiscoveredResource] = []
    client = session.client("shield", region_name="us-east-1")

    def _fetch():
        sub = client.describe_subscription()
        arn = sub.get("Subscription", {}).get("SubscriptionArn", "shield:subscription")
        resources.append(DiscoveredResource(
            service="Shield", resource_type="Subscription",
            resource_id=arn, name="Shield Advanced",
            region="global", state="active", canvas_type="shield",
            attributes={
                "start_time": str(sub.get("Subscription", {}).get("StartTime", "")),
            },
        ))

    _safe(_fetch, "Shield:Subscription", errors)
    return resources


def _discover_macie(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("macie2", region_name=region)

    def _fetch():
        session_info = client.get_macie_session()
        if session_info.get("status") != "ENABLED":
            return
        account = _account_id(session)
        rid = f"macie2:{region}:{account}"
        resources.append(DiscoveredResource(
            service="Macie", resource_type="Session",
            resource_id=rid, name=f"Macie ({region})",
            region=region, state="enabled", canvas_type="macie",
            attributes={
                "finding_publishing_frequency": session_info.get("findingPublishingFrequency"),
            },
        ))
        paginator = client.get_paginator("list_classification_jobs")
        for page in paginator.paginate():
            for job in page.get("items", []):
                job_id = job["jobId"]
                name = job.get("name") or job_id
                resources.append(DiscoveredResource(
                    service="Macie", resource_type="Classification Job",
                    resource_id=job_id, name=name,
                    region=region, state=job.get("jobStatus", "unknown").lower(),
                    canvas_type="macie",
                    attributes={"job_type": job.get("jobType")},
                ))

    _safe(_fetch, "Macie2:Session", errors)
    return resources


def _discover_quicksight(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("quicksight", region_name=region)

    def _fetch():
        account = _account_id(session)
        paginator = client.get_paginator("list_dashboards")
        for page in paginator.paginate(AwsAccountId=account):
            for dash in page.get("DashboardSummaryList", []):
                arn = dash["Arn"]
                name = dash.get("Name") or arn.split("/")[-1]
                resources.append(DiscoveredResource(
                    service="QuickSight", resource_type="Dashboard",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="quicksight",
                    attributes={
                        "created_time": str(dash.get("CreatedTime", "")),
                        "last_updated": str(dash.get("LastUpdatedTime", "")),
                    },
                ))

    _safe(_fetch, "QuickSight:Dashboards", errors)
    return resources


def _discover_lakeformation(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("lakeformation", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_resources")
        for page in paginator.paginate():
            for item in page.get("ResourceInfoList", []):
                arn = item.get("ResourceArn")
                if not arn:
                    continue
                name = arn.split("/")[-1]
                resources.append(DiscoveredResource(
                    service="Lake Formation", resource_type="Registered Resource",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="lakeformation",
                    attributes={
                        "role_arn": item.get("RoleArn"),
                        "last_modified": str(item.get("LastModified", "")),
                    },
                ))

    _safe(_fetch, "LakeFormation:Resources", errors)
    return resources


def _discover_bedrock(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("bedrock", region_name=region)

    def _fetch_custom_models():
        paginator = client.get_paginator("list_custom_models")
        for page in paginator.paginate():
            for model in page.get("modelSummaries", []):
                arn = model["modelArn"]
                name = model.get("modelName") or arn.split("/")[-1]
                resources.append(DiscoveredResource(
                    service="Bedrock", resource_type="Custom Model",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="bedrock",
                    attributes={
                        "base_model_arn": model.get("baseModelArn"),
                        "creation_time": str(model.get("creationTime", "")),
                    },
                ))

    def _fetch_throughputs():
        paginator = client.get_paginator("list_provisioned_model_throughputs")
        for page in paginator.paginate():
            for pt in page.get("provisionedModelSummaries", []):
                arn = pt["provisionedModelArn"]
                name = pt.get("provisionedModelName") or arn.split("/")[-1]
                resources.append(DiscoveredResource(
                    service="Bedrock", resource_type="Provisioned Throughput",
                    resource_id=arn, name=name,
                    region=region, state=pt.get("status", "active").lower(),
                    canvas_type="bedrock",
                    attributes={
                        "model_arn": pt.get("modelArn"),
                    },
                ))

    _safe(_fetch_custom_models, "Bedrock:CustomModels", errors)
    _safe(_fetch_throughputs, "Bedrock:ProvisionedThroughput", errors)
    return resources


def _discover_rekognition(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("rekognition", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_collections")
        for page in paginator.paginate():
            for collection_id in page.get("CollectionIds", []):
                arn = f"arn:aws:rekognition:{region}::collection/{collection_id}"
                resources.append(DiscoveredResource(
                    service="Rekognition", resource_type="Collection",
                    resource_id=arn, name=collection_id,
                    region=region, state="active", canvas_type="rekognition",
                    attributes={},
                ))

    _safe(_fetch, "Rekognition:Collections", errors)
    return resources


def _discover_comprehend(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("comprehend", region_name=region)

    def _fetch_classifiers():
        paginator = client.get_paginator("list_document_classifiers")
        for page in paginator.paginate():
            for clf in page.get("DocumentClassifierSummaries", []):
                arn = clf["DocumentClassifierArn"]
                name = clf.get("DocumentClassifierName") or arn.split("/")[-1]
                resources.append(DiscoveredResource(
                    service="Comprehend", resource_type="Document Classifier",
                    resource_id=arn, name=name,
                    region=region, state=clf.get("Status", "unknown").lower(),
                    canvas_type="comprehend",
                    attributes={"language_code": clf.get("LanguageCode")},
                ))

    def _fetch_recognizers():
        paginator = client.get_paginator("list_entity_recognizers")
        for page in paginator.paginate():
            for er in page.get("EntityRecognizerSummaries", []):
                arn = er["EntityRecognizerArn"]
                name = er.get("EntityRecognizerName") or arn.split("/")[-1]
                resources.append(DiscoveredResource(
                    service="Comprehend", resource_type="Entity Recognizer",
                    resource_id=arn, name=name,
                    region=region, state=er.get("Status", "unknown").lower(),
                    canvas_type="comprehend",
                    attributes={},
                ))

    _safe(_fetch_classifiers, "Comprehend:DocumentClassifiers", errors)
    _safe(_fetch_recognizers, "Comprehend:EntityRecognizers", errors)
    return resources


def _discover_textract(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("textract", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_adapters")
        for page in paginator.paginate():
            for adapter in page.get("Adapters", []):
                adapter_id = adapter["AdapterId"]
                name = adapter.get("AdapterName") or adapter_id
                arn = adapter.get("AdapterArn", adapter_id)
                resources.append(DiscoveredResource(
                    service="Textract", resource_type="Adapter",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="textract",
                    attributes={
                        "creation_time": str(adapter.get("CreationTime", "")),
                    },
                ))

    _safe(_fetch, "Textract:Adapters", errors)
    return resources


def _discover_polly(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("polly", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_lexicons")
        for page in paginator.paginate():
            for lexicon in page.get("Lexicons", []):
                name = lexicon["Name"]
                resources.append(DiscoveredResource(
                    service="Polly", resource_type="Lexicon",
                    resource_id=f"polly-lexicon:{region}:{name}", name=name,
                    region=region, state="active", canvas_type="polly",
                    attributes={
                        "attributes": lexicon.get("Attributes", {}),
                    },
                ))

    _safe(_fetch, "Polly:Lexicons", errors)
    return resources


def _discover_translate(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("translate", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_terminologies")
        for page in paginator.paginate():
            for term in page.get("TerminologyPropertiesList", []):
                name = term["Name"]
                arn = term.get("Arn", f"translate-terminology:{region}:{name}")
                resources.append(DiscoveredResource(
                    service="Translate", resource_type="Terminology",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="translate",
                    attributes={
                        "source_language_code": term.get("SourceLanguageCode"),
                        "target_language_codes": term.get("TargetLanguageCodes", []),
                    },
                ))

    _safe(_fetch, "Translate:Terminologies", errors)
    return resources


def _discover_lex(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("lexv2-models", region_name=region)

    def _fetch():
        paginator = client.get_paginator("list_bots")
        for page in paginator.paginate():
            for bot in page.get("botSummaries", []):
                bot_id = bot["botId"]
                name = bot.get("botName") or bot_id
                arn = bot.get("botArn", bot_id)
                resources.append(DiscoveredResource(
                    service="Lex", resource_type="Bot",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="lex",
                    attributes={
                        "description": bot.get("description", ""),
                    },
                ))

    _safe(_fetch, "Lex:Bots", errors)
    return resources


def _discover_xray(session, region: str, errors: list) -> list[DiscoveredResource]:
    resources: list[DiscoveredResource] = []
    client = session.client("xray", region_name=region)

    def _fetch():
        paginator = client.get_paginator("get_groups")
        for page in paginator.paginate():
            for group in page.get("Groups", []):
                name = group["GroupName"]
                arn = group.get("GroupARN", name)
                resources.append(DiscoveredResource(
                    service="X-Ray", resource_type="Group",
                    resource_id=arn, name=name,
                    region=region, state="active", canvas_type="xray",
                    attributes={
                        "insights_enabled": group.get("InsightsConfiguration", {}).get("InsightsEnabled"),
                    },
                ))

    _safe(_fetch, "XRay:Groups", errors)
    return resources


PALETTE_DISCOVERERS: list[Any] = [
    _discover_s3_glacier,
    _discover_inspector,
    _discover_security_hub,
    _discover_shield,
    _discover_macie,
    _discover_quicksight,
    _discover_lakeformation,
    _discover_bedrock,
    _discover_rekognition,
    _discover_comprehend,
    _discover_textract,
    _discover_polly,
    _discover_translate,
    _discover_lex,
    _discover_xray,
]
