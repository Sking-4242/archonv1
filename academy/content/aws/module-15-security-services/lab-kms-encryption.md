---
title: "Canvas Lab: KMS Customer Managed Key with S3 SSE-KMS and Key Policy Access Control"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "SAP-C02"]
canvas_type: starter
---

# Canvas Lab: KMS Customer Managed Key with S3 SSE-KMS and Key Policy Access Control

## Challenge

A compliance team requires that all sensitive documents stored in S3 be encrypted with a customer-managed KMS key — not the default AWS-managed key — and that only a specific application IAM role can decrypt them. You need to create a Customer Managed Key (CMK) with a least-privilege key policy that grants decrypt access only to the application role, configure an S3 bucket to use this CMK as its default encryption key, and then prove that access control works by attempting to read an uploaded object from two different IAM roles — one that is authorized in the key policy and one that is not.

## Learning Objectives

- Create a KMS Customer Managed Key (CMK) with a least-privilege key policy that restricts Decrypt and GenerateDataKey to a specific IAM role
- Configure an S3 bucket with default SSE-KMS encryption using a CMK so that all objects are automatically encrypted on upload
- Verify that an IAM role not listed in the key policy receives an Access Denied (403) error when attempting to read an encrypted S3 object
- Modify a KMS key policy to grant access to an additional IAM role and confirm that access is immediately granted without re-uploading the object
- Verify KMS API calls (kms:Decrypt) in CloudTrail to confirm the encryption and decryption audit trail

## Steps

1. Navigate to **IAM → Roles → Create role** — create two roles named `AppRole` and `AuditRole`, both with the **AWS service** trusted entity type set to EC2 (or use CloudShell's assumed role); attach the `AmazonS3ReadOnlyAccess` managed policy to both roles so they can attempt S3 GetObject
2. Navigate to **KMS → Customer managed keys → Create key** — key type **Symmetric**, key usage **Encrypt and decrypt**; on the next screen set alias `alias/prod-app-key`
3. On the **Key administrators** screen, add your current IAM user or admin role as a key administrator (this grants management permissions but not usage permissions)
4. On the **Key usage permissions** screen, add only `AppRole` — do NOT add `AuditRole`; review the generated key policy JSON and confirm it contains a statement allowing `kms:Decrypt` and `kms:GenerateDataKey` for `AppRole` only; complete key creation
5. Navigate to **S3 → Create bucket** — name it `compliance-docs-<your-account-id>`, block all public access; under **Default encryption** select **SSE-KMS**, choose **Enter a KMS key ARN**, and paste the ARN of `alias/prod-app-key`; create the bucket
6. Upload a test file to the bucket (any text file will work); after upload, click on the object and scroll to **Server-side encryption settings** — confirm it shows **SSE-KMS** and displays the ARN of your CMK
7. Open **CloudShell** — run `aws sts assume-role --role-arn <AppRole-ARN> --role-session-name test-app` to get temporary credentials; export the returned `AccessKeyId`, `SecretAccessKey`, and `SessionToken` as environment variables
8. With `AppRole` credentials active, run `aws s3 cp s3://compliance-docs-<your-account-id>/testfile.txt -` — confirm the file contents are printed to the terminal (success: KMS decrypted the data key transparently)
9. Now assume `AuditRole` credentials the same way and repeat the same `aws s3 cp` command — confirm you receive an **Access Denied** error (403); this error originates from KMS refusing to decrypt the data key, not from S3
10. Return to **KMS → Customer managed keys → alias/prod-app-key → Key policy** — click **Edit**; in the key usage statement that currently allows only `AppRole`, add `AuditRole`'s ARN to the `Principal.AWS` list; save the policy
11. Re-run the `aws s3 cp` command with `AuditRole` credentials — confirm the file is now readable without re-uploading or re-encrypting the object; this demonstrates that KMS key policies take effect immediately and control access to all objects encrypted under that key
12. Navigate to **CloudTrail → Event history** — filter by **Event name = Decrypt** and **Event source = kms.amazonaws.com**; confirm you can see the successful decrypt calls from `AppRole` and the failed attempt from `AuditRole`, along with the requesting identity and timestamp

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
