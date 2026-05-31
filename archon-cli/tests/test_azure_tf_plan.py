"""Terraform plan parsing and validation for Azure (azurerm) resources."""

from archon_cli.azure_tf_map import AZURE_TF_TYPE_MAP
from archon_cli.azure_validate import run_azure_validation
from archon_cli.validate import parse_plan_json, validate_plan_json


def _plan_resource(tf_type: str, name: str, values: dict) -> dict:
    address = f"{tf_type}.{name}"
    return {
        "type": tf_type,
        "name": name,
        "address": address,
        "values": values,
    }


def _minimal_plan(*resources: dict) -> dict:
    return {
        "planned_values": {"root_module": {"resources": list(resources)}},
        "resource_changes": [],
        "configuration": {"root_module": {"resources": []}},
    }


class TestAzureTfTypeMap:
    def test_map_has_at_least_80_entries(self):
        assert len(AZURE_TF_TYPE_MAP) >= 80

    def test_linux_vm_maps_to_azure_vm(self):
        assert AZURE_TF_TYPE_MAP["azurerm_linux_virtual_machine"] == "azure_vm"

    def test_storage_account_maps_to_azure_blob(self):
        assert AZURE_TF_TYPE_MAP["azurerm_storage_account"] == "azure_blob"


class TestAzureVmPlanValidation:
    def test_linux_vm_maps_and_password_auth_rule(self):
        plan = _minimal_plan(
            _plan_resource(
                "azurerm_linux_virtual_machine",
                "web",
                {"disable_password_authentication": False, "size": "Standard_B2s"},
            ),
        )
        nodes, edges, sgs, iam = parse_plan_json(plan)
        assert len(nodes) == 1
        assert nodes[0].type == "azure_vm"
        assert nodes[0].tf_type == "azurerm_linux_virtual_machine"

        findings = run_azure_validation(nodes, edges, sgs, iam)
        assert any(f.rule_id == "azure_vm_password_auth" for f in findings)

    def test_password_auth_disabled_no_finding(self):
        plan = _minimal_plan(
            _plan_resource(
                "azurerm_linux_virtual_machine",
                "web",
                {"disable_password_authentication": True},
            ),
        )
        nodes, edges, sgs, iam = parse_plan_json(plan)
        findings = run_azure_validation(nodes, edges, sgs, iam)
        assert not any(f.rule_id == "azure_vm_password_auth" for f in findings)


class TestAzureStoragePlanValidation:
    def test_storage_account_public_access_rule(self):
        plan = _minimal_plan(
            _plan_resource(
                "azurerm_storage_account",
                "logs",
                {"allow_nested_items_to_be_public": True},
            ),
        )
        nodes, edges, sgs, iam = parse_plan_json(plan)
        assert nodes[0].type == "azure_blob"

        findings = run_azure_validation(nodes, edges, sgs, iam)
        assert any(f.rule_id == "azure_storage_public_access" for f in findings)

    def test_storage_account_private_no_public_rule(self):
        plan = _minimal_plan(
            _plan_resource(
                "azurerm_storage_account",
                "logs",
                {"allow_nested_items_to_be_public": False},
            ),
        )
        nodes, edges, sgs, iam = parse_plan_json(plan)
        findings = run_azure_validation(nodes, edges, sgs, iam)
        assert not any(f.rule_id == "azure_storage_public_access" for f in findings)


class TestAzureNsgPlanParsing:
    def test_network_security_group_inline_rules(self):
        plan = _minimal_plan(
            _plan_resource(
                "azurerm_network_security_group",
                "web",
                {
                    "name": "web-nsg",
                    "security_rule": [{
                        "name": "ssh",
                        "direction": "Inbound",
                        "access": "Allow",
                        "protocol": "Tcp",
                        "destination_port_range": "22",
                        "source_address_prefix": "0.0.0.0/0",
                    }],
                },
            ),
        )
        nodes, _, sgs, _ = parse_plan_json(plan)
        assert nodes[0].type == "azure_nsg"
        assert len(sgs) == 1
        assert sgs[0].inbound[0].port == "22"

        findings = run_azure_validation(nodes, [], sgs, [])
        assert any(f.rule_id == "azure_nsg_ssh_open" for f in findings)

    def test_standalone_network_security_rule(self):
        plan = _minimal_plan(
            _plan_resource("azurerm_network_security_group", "web", {"name": "web-nsg"}),
            _plan_resource(
                "azurerm_network_security_rule",
                "ssh",
                {
                    "direction": "Inbound",
                    "access": "Allow",
                    "protocol": "Tcp",
                    "destination_port_range": "22",
                    "source_address_prefix": "0.0.0.0/0",
                    "network_security_group_name": "azurerm_network_security_group.web.name",
                },
            ),
        )
        _, _, sgs, _ = parse_plan_json(plan)
        assert len(sgs) >= 1
        all_inbound = [r for sg in sgs for r in sg.inbound]
        assert any(r.port == "22" for r in all_inbound)


class TestValidatePlanJsonAzure:
    def test_validate_plan_json_runs_azure_rules(self):
        plan = _minimal_plan(
            _plan_resource(
                "azurerm_linux_virtual_machine",
                "web",
                {"disable_password_authentication": False},
            ),
        )
        findings = validate_plan_json(plan)
        assert any(f.rule_id == "azure_vm_password_auth" for f in findings)
