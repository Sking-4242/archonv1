---
title: "Multi-Factor Authentication (MFA)"
type: content
estimated_minutes: 14
cert_tags: ["aws_ccp", "aws_saa", "aws_soa", "aws_scs"]
---

# Multi-Factor Authentication (MFA)

## Overview

Multi-Factor Authentication requires a second form of verification in addition to a password or access key. The core idea is that authentication factors belong to distinct categories: something you know (a password), something you have (a device that generates or stores a credential), and something you are (biometrics). MFA combines at least two of these categories, so an attacker who steals one factor — through phishing, credential stuffing, a data breach, or malware — still cannot authenticate without the second factor, which typically requires physical access to a specific device.

In the context of AWS IAM, MFA is the single highest-return security control available for human user accounts. It does not eliminate all risk — a sophisticated attacker who can intercept both a password and a time-based one-time password (TOTP) code within the 30-second validity window can still succeed — but it dramatically raises the cost and complexity of account compromise. Enabling MFA on the root account immediately after creating an AWS account is the first recommendation in AWS's own security guidance, featured at the top of the IAM dashboard's Security Recommendations panel, and one of the most frequently tested topics on every IAM-related exam question. It is not advanced knowledge; it is table stakes.

MFA in AWS is not just a login gate. IAM policy Condition blocks allow you to require MFA for specific API operations — access to sensitive S3 data, IAM management actions, KMS key usage, DynamoDB table reads — even for users who are already authenticated to the console with a password. This makes MFA a per-operation control, not just a perimeter check, and enables granular enforcement where the data and actions are most sensitive. A user authenticated without MFA can do routine development work; the same user is blocked from the financial records bucket until they re-authenticate with their MFA device. The enforcement mechanism is a single policy Condition block, not an architectural change.

## Core Concepts

### MFA Device Types: What AWS Supports

AWS supports four MFA device types for IAM users, each with different security properties, deployment complexity, and phishing resistance:

**Virtual MFA Devices (TOTP — Time-based One-Time Password)**

Software applications running on a smartphone or computer that implement RFC 6238 TOTP. Examples: Google Authenticator, Authy, Microsoft Authenticator, 1Password, Bitwarden. During enrollment, the app is seeded with a secret key via a QR code scan. Every 30 seconds, the app and AWS independently compute the same 6-digit code using the shared secret and the current Unix timestamp. You enter the code; AWS computes the expected code; they match; authentication proceeds.

Virtual MFA is free, widely supported, and dramatically better than password-only authentication. It is the most common MFA method in practice and the most practical choice for standard developer and operations accounts.

**Security consideration:** TOTP codes are vulnerable to real-time phishing. An attacker can create a fake AWS login page that captures your username, password, and TOTP code simultaneously and immediately relays them to the real AWS console. Because the TOTP code is valid for 30 seconds, the relay can succeed before the code expires. Virtual MFA stops credential stuffing and password reuse attacks cold — but it is not phishing-resistant against a targeted, real-time attack.

**Hardware TOTP Tokens**

Physical devices (Gemalto SafeNet, Thales Group, specific Yubico models in OTP mode) that generate time-based one-time codes without requiring a smartphone. They have no internet or Bluetooth connectivity, cannot be compromised by phone malware, and are purpose-built for authentication. More operationally secure than virtual MFA because they cannot be backed up, cloned, or compromised through a phone OS vulnerability.

The same TOTP phishing vulnerability applies to hardware tokens — a real-time phishing attack can capture and relay the code within the 30-second window. Hardware tokens are stronger than virtual MFA in terms of device security, but both are vulnerable to the same relay attack vector.

**FIDO2 / WebAuthn Hardware Security Keys**

Physical security keys such as YubiKey 5, Google Titan Key, Feitian keys, or any FIDO2-certified device that implements the WebAuthn specification. These use asymmetric public-key cryptography and origin-binding. During enrollment, the key generates a key pair; the public key is stored with AWS; the private key never leaves the hardware. During authentication, the browser sends a cryptographic challenge to the key; the key signs it with the private key; AWS verifies the signature with the registered public key.

The critical differentiator — FIDO2 is **phishing-resistant**. The key's signed response includes the exact origin (domain) where the authentication is happening. The key signs a response for `signin.aws.amazon.com`. If an attacker creates a fake site at `signin.aws-console.com` and the user is deceived into visiting it, the browser passes `signin.aws-console.com` as the origin in the challenge to the key. The key signs a response for `signin.aws-console.com`. AWS receives this response and rejects it because it was signed for the wrong origin. The attacker cannot forge a valid response for `signin.aws.amazon.com` without the private key, which never leaves the hardware.

For root accounts and high-privilege admin users who are realistic phishing targets, FIDO2 keys are the recommended MFA type. They are also the only type that provides protection against sophisticated, real-time spear-phishing attacks.

**SMS MFA (Deprecated)**

One-time codes sent via text message. AWS previously offered this for IAM users but has deprecated it for new enrollment. SMS is vulnerable to SIM-swapping attacks (where an attacker convinces a mobile carrier to transfer the victim's phone number to an attacker-controlled SIM) and SS7 protocol attacks. It is also the only MFA type where the second factor travels over an untrusted third-party network (the mobile carrier). Do not use SMS MFA for AWS accounts. It is not a valid answer on current exam questions about MFA device types.

### Why FIDO2 Is Phishing-Resistant: The Technical Mechanism

Understanding why FIDO2 defeats phishing requires understanding the flow of a successful TOTP phishing attack and how FIDO2's design prevents the same attack:

**TOTP Phishing Attack Flow:**
1. Attacker creates a convincing fake login page at `signin.aws-account.com`
2. Attacker sends a targeted email to victim: "Your AWS account requires verification"
3. Victim clicks the link, enters their username, password, and current TOTP code
4. Attacker's server receives these credentials and immediately submits them to the real `signin.aws.amazon.com`
5. AWS authenticates the attacker with the victim's credentials — the TOTP code is valid for up to 30 seconds
6. Victim sees an error page ("invalid credentials" or a redirect); attacker has a live session
7. The entire attack takes under 10 seconds and requires no malware on the victim's device

**Why FIDO2 Defeats This Attack:**
1. Attacker creates the same fake login page
2. Browser initiates FIDO2 authentication; as part of the WebAuthn protocol, it includes the current origin (the exact URL the browser is on) as a required field in the authentication challenge sent to the security key
3. The security key receives a challenge that includes `origin: https://signin.aws-account.com`
4. The key computes and signs a response that includes this origin value
5. Even if the attacker relays this signed response to the real AWS server, AWS checks whether the origin in the signed response matches the origin the security key was registered on
6. The key was registered on `https://signin.aws.amazon.com`, but the signed response contains `https://signin.aws-account.com`
7. AWS rejects the response — origin mismatch
8. The attacker receives nothing useful; the victim's key cannot produce a valid response for a domain it was never registered on

The protection is cryptographic and origin-bound — it does not depend on the user being vigilant about URL inspection, noticing subtle domain differences, or resisting social engineering. Even a user who is perfectly deceived by a fake site cannot provide a usable FIDO2 credential to an attacker for a different domain.

### Enforcing MFA via IAM Policy Conditions

Enabling MFA on a user account protects the login process. But once a user is logged in, their IAM policies determine what they can do — and those policies may allow sensitive operations regardless of whether MFA was used during login. To require MFA for specific operations, you use an explicit Deny with an MFA condition.

The condition variable is `aws:MultiFactorAuthPresent`. This context key is set to `"true"` when:
- A user authenticates to the AWS console using password + MFA device
- A user calls `sts:GetSessionToken` with their access keys + an MFA code, producing temporary credentials tagged with MFA context

The key is `"false"` or absent when:
- A user authenticates to the console with only a password (no MFA)
- A user uses access keys directly without calling `sts:GetSessionToken` with MFA first
- Temporary credentials were issued by `sts:AssumeRole` without MFA context

**The BoolIfExists operator is required for MFA enforcement** because of the "absent" case. `Bool` evaluates the condition only when the key exists in the request context. For some credential types — notably role sessions from AWS services and direct access key usage — `aws:MultiFactorAuthPresent` is absent from the context entirely (not set to false, just not present). A `Bool` condition checking for `false` would not fire when the key is absent, leaving the Deny silently ineffective for those credential types.

`BoolIfExists` extends `Bool` by also evaluating to true when the condition key is absent, treating absence the same as the specified value. With `"BoolIfExists": {"aws:MultiFactorAuthPresent": "false"}`, the condition fires for:
- Sessions where `aws:MultiFactorAuthPresent` is explicitly `false` (logged in without MFA)
- Sessions where `aws:MultiFactorAuthPresent` is absent from the context entirely

This correctly blocks any session that lacks MFA evidence.

### Root Account MFA: Non-Negotiable

The root account has complete, unrestricted access to every resource and action in the AWS account. It can delete all IAM users and roles, revoke all access, exfiltrate all data, modify billing, and close the account. Root access cannot be restricted by IAM policies. Root cannot be restricted by SCPs for the management account in AWS Organizations. If the root account is compromised, the damage is limited only by how quickly you detect and respond — there is no IAM-level safety net.

Root MFA cannot be enforced by policy — because IAM policies do not apply to the root user. The only control is enabling MFA directly on the root account. AWS flags its absence prominently on the IAM dashboard's Security Recommendations panel, and the CIS AWS Foundations Benchmark requires root MFA as a foundational control.

**Non-negotiable root account security practices:**
1. Enable MFA immediately — use a hardware FIDO2 key or hardware TOTP token, not a virtual MFA app tied to a phone that could be lost, stolen, or compromised by malware
2. Do not create access keys for the root account — if root access keys exist, delete them immediately (`aws iam delete-access-key`)
3. Store the root password, MFA device, and backup codes in physically separate, secure locations (not on the same machine or desk as your daily work)
4. Use root only for the specific tasks that require it — changing the account email address, closing the account, changing the support plan tier, restoring IAM access if all admin users are locked out
5. Enable CloudTrail in all Regions — any root account usage generates a CloudTrail event with `userIdentity.type: Root`. Configure a CloudWatch Alarm to trigger an SNS notification on any `Root` event in CloudTrail

### MFA Delete for S3

An important related concept for S3: **MFA Delete** is a bucket-level setting that requires MFA authentication to change bucket versioning state or permanently delete object versions. When MFA Delete is enabled on a versioned bucket, `PUT Bucket versioning` (changing versioning state) and `DELETE Object versionId` requests must include the MFA token header in the API call. Without valid MFA, those operations are rejected by S3 regardless of the IAM permissions of the requester.

MFA Delete can only be enabled or disabled by the bucket owner using the root account credentials — it is one of the few bucket operations that explicitly requires root, not just an admin IAM user. Once enabled, MFA Delete protects the versioned objects in the bucket from permanent deletion even by IAM principals with full S3 access.

## Configuration Reference

### Full MFA Enforcement Policy: Deny Without MFA, Allow MFA Setup

This policy demonstrates the complete pattern for requiring MFA on sensitive resources while allowing users to register their MFA device before the enforcement kicks in:

```json
{
  "Version": "2012-10-17",
  "Statement": [

    {
      // Statement 1: Always allow MFA setup actions — no MFA condition on this.
      // These are the ONLY actions a user can take before registering MFA.
      // Without these exceptions, a brand-new user would be denied even the
      // actions they need to register their MFA device — a chicken-and-egg lockout.
      //
      // iam:CreateVirtualMFADevice    — creates the TOTP secret and QR code seed
      // iam:EnableMFADevice           — links the new MFA device to the user account
      // iam:GetUser                   — allows the user to see their own user record
      // iam:ListMFADevices            — lists enrolled MFA devices (shows none before setup)
      // iam:ListVirtualMFADevices     — lists virtual MFA devices by ARN
      // iam:ResyncMFADevice           — resyncs a drifted TOTP device
      // sts:GetSessionToken           — required to get MFA-tagged temporary credentials
      //                                for CLI usage after MFA is set up
      "Sid": "AllowMFASetupActionsAlways",
      "Effect": "Allow",
      "Action": [
        "iam:CreateVirtualMFADevice",
        "iam:EnableMFADevice",
        "iam:GetUser",
        "iam:ListMFADevices",
        "iam:ListVirtualMFADevices",
        "iam:ResyncMFADevice",
        "sts:GetSessionToken"
      ],
      // Resource "*" is appropriate here — user ARNs vary and MFA device ARNs
      // are not predictable during the setup flow.
      "Resource": "*"
    },

    {
      // Statement 2: Allow access to the sensitive S3 bucket.
      // Note: this Allow is NOT conditioned on MFA directly —
      // Statement 3's explicit Deny handles the MFA gate.
      // This separation makes the policy cleaner and more readable.
      "Sid": "AllowSensitiveBucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        // Both the bucket ARN and the object ARN — required for both
        // bucket-level (ListBucket) and object-level (GetObject, PutObject) actions.
        "arn:aws:s3:::company-financial-records",
        "arn:aws:s3:::company-financial-records/*"
      ]
    },

    {
      // Statement 3: Explicit Deny — blocks ALL listed S3 actions on this bucket
      // when the session does not have valid MFA context.
      //
      // This Deny overrides Statement 2's Allow when MFA is absent.
      // Explicit Deny ALWAYS beats Explicit Allow in IAM evaluation.
      // A user without MFA gets AccessDenied regardless of Statement 2.
      "Sid": "DenySensitiveBucketWithoutMFA",
      "Effect": "Deny",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetObjectVersion",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::company-financial-records",
        "arn:aws:s3:::company-financial-records/*"
      ],
      "Condition": {
        // BoolIfExists is REQUIRED here — not Bool.
        //
        // "Bool" only evaluates when the condition key is present in the context.
        // For role sessions initiated by AWS services (Lambda, ECS, EC2 service calls),
        // aws:MultiFactorAuthPresent is ABSENT from the context — not false, just missing.
        // A plain "Bool" condition would NOT fire for these absent cases,
        // leaving the Deny silent and the S3 access open for non-MFA role sessions.
        //
        // "BoolIfExists" fires BOTH when the key is present AND false,
        // AND when the key is absent entirely (treating absence as false).
        // This ensures the Deny applies to every session lacking MFA evidence —
        // whether MFA was explicitly not used, or simply never part of the auth flow.
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }

  ]
}
```

### The Deny-Only Pattern for Enforcing MFA Account-Wide

This is the minimal pattern to use as a standalone policy or appended to an existing policy to block everything except MFA setup actions until MFA is registered. Use `NotAction` to exclude exactly the actions a user needs to set up MFA:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      // "NotAction" is the inverse of "Action" — the Deny applies to EVERYTHING
      // except the listed actions. The listed actions are explicitly exempted.
      // This pattern is the canonical "force MFA setup" policy.
      "Sid": "DenyEverythingExceptMFASetupWhenMFAAbsent",
      "Effect": "Deny",
      "NotAction": [
        "iam:CreateVirtualMFADevice",
        "iam:EnableMFADevice",
        "iam:GetUser",
        "iam:ListMFADevices",
        "iam:ListVirtualMFADevices",
        "iam:ResyncMFADevice",
        "sts:GetSessionToken"
      ],
      // Resource "*" — this Deny is account-wide in scope.
      // Any non-exempted action on any resource is blocked without MFA.
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

**How this policy works in practice:**
- A new user logs in with just their password, no MFA registered yet
- They try to open the S3 console — Denied (s3:ListBuckets is in "NotAction" scope)
- They try to open the EC2 console — Denied
- They navigate to IAM → Users → Their own user → Security credentials — Allowed (iam:GetUser, iam:ListMFADevices are exempted)
- They click Assign MFA device and scan the QR code — Allowed (iam:CreateVirtualMFADevice, iam:EnableMFADevice are exempted)
- They sign out, sign back in with password + TOTP code
- `aws:MultiFactorAuthPresent` is now `true` — the Deny condition `BoolIfExists: false` no longer fires
- All their other permissions are now available

### AWS CLI: Enable Virtual MFA on an IAM User

```bash
# Step 1: Create the virtual MFA device (generates the TOTP secret)
# --bootstrap-method QRCodePNG saves a PNG you can scan with your authenticator app
# --bootstrap-method Base32StringSeed returns the seed as text for manual entry
aws iam create-virtual-mfa-device \
  --virtual-mfa-device-name alice-mfa \
  --outfile /tmp/alice-mfa-qr.png \
  --bootstrap-method QRCodePNG
# Returns the device ARN: arn:aws:iam::123456789012:mfa/alice-mfa

# Step 2: Scan the QR code at /tmp/alice-mfa-qr.png with Google Authenticator or Authy.
# Wait for two CONSECUTIVE 6-digit codes across two separate 30-second windows.
# You cannot reuse the same code twice — IAM requires two sequential codes to confirm enrollment.

# Step 3: Enable the MFA device — provide two consecutive codes
aws iam enable-mfa-device \
  --user-name alice \
  --serial-number arn:aws:iam::123456789012:mfa/alice-mfa \
  --authentication-code1 123456 \
  --authentication-code2 789012
# Code1 = code from the current 30-second window
# Code2 = code from the NEXT 30-second window (not the same code twice)

# To verify MFA is enabled:
aws iam list-mfa-devices --user-name alice
# Returns the registered MFA device ARN and EnableDate
```

**Note on FIDO2/WebAuthn enrollment:** FIDO2 hardware security key enrollment requires a browser interaction — the WebAuthn API is a browser API, and the key's challenge-response flow cannot be replicated via CLI. TOTP-based MFA (virtual and hardware token) can be enrolled via CLI using `aws iam enable-mfa-device`. For FIDO2 enrollment, use the console process below.

### Console: Enable MFA on an IAM User (Step-by-Step)

1. IAM → left pane → **Users** → select the user → **Security credentials** tab
2. In the **Multi-factor authentication (MFA)** section → click **Assign MFA device**
3. Enter a device name that identifies the device type and owner (e.g., `alice-yubikey`, `alice-google-auth`)
4. Select the MFA device type:
   - **Authenticator app** → for virtual TOTP (Google Authenticator, Authy, Microsoft Authenticator)
   - **Security key** → for FIDO2 hardware keys (YubiKey, Google Titan Key)
   - **Hardware TOTP token** → for physical TOTP devices (Gemalto, Thales)
5. **For Authenticator app:** scan the displayed QR code with your app, then enter two consecutive codes in the Code 1 and Code 2 fields to confirm enrollment
6. **For Security key:** insert the key into a USB port (or hold near device for NFC keys) → click the button on the security key when prompted by the browser WebAuthn dialog
7. **For Hardware TOTP token:** enter the serial number printed on the device, then provide two consecutive codes
8. Click **Add MFA** to complete enrollment
9. The MFA device now appears in the Security credentials tab with its type, serial number, and enrollment date

### Console: Enable MFA on the Root Account

1. Click the account name in the top-right corner of any AWS console page → **Security credentials**
2. If prompted to confirm you want to access root security credentials, click **Continue to Security credentials**
3. In the **Multi-factor authentication (MFA)** section → **Assign MFA device**
4. Follow the same steps as above — for the root account, AWS strongly recommends a hardware FIDO2 key
5. After enrollment, sign out completely
6. Sign back in — you will be prompted for your MFA device at the sign-in screen, not after
7. Test that MFA is working before storing the root credentials in long-term secure storage

### Console: Audit MFA Status Across All Users

1. IAM → left pane → **Credential report** → **Download Report**
2. Open the downloaded CSV file
3. Look at the **mfa_active** column — `TRUE` indicates MFA is enrolled, `FALSE` indicates it is not
4. Filter or sort on `FALSE` to identify all users without MFA — these are security findings requiring action
5. Cross-reference with the **password_enabled** column — users with `password_enabled: true` and `mfa_active: false` have console access protected by only a password

## How to Decide

| Situation | MFA Type / Approach | Why |
|---|---|---|
| Root account protection | Hardware FIDO2 key (YubiKey, Titan Key) | Phishing-resistant; not stored on a phone; can be physically secured |
| High-privilege admin accounts (targeted phishing risk) | FIDO2 key preferred; hardware TOTP acceptable | Higher assurance; not susceptible to phone malware or real-time TOTP relay |
| Developer / standard user accounts (CCP/associate team) | Virtual MFA (Google Authenticator, Authy) | Free, convenient, sufficient for non-root non-admin accounts |
| Enforcing MFA for sensitive S3 access | Deny + `BoolIfExists: aws:MultiFactorAuthPresent: false` | Per-operation gate that overrides all Allow statements |
| Forcing all new users to set up MFA before accessing anything | `NotAction` + Deny pattern exempting MFA setup actions | Blocks everything non-MFA-setup until device is registered |
| Detecting users without MFA enrolled | IAM credential report (`mfa_active` column = FALSE) | Account-wide CSV; filter for missing MFA in bulk |
| Legacy CLI tooling using access keys (no interactive MFA) | Roles where possible; `sts:GetSessionToken` with MFA for users | Access keys alone do not carry MFA context; STS call tags the resulting credentials |
| Permanent object deletion protection for S3 | MFA Delete on versioned S3 buckets | Requires root + MFA to permanently delete versioned objects |

## How This Connects

- **AWS CloudTrail** — root account console sign-ins and any root API calls generate CloudTrail events with `userIdentity.type: Root`. MFA device registration and deactivation events are also logged. Configuring a CloudWatch Metric Filter and Alarm on `$.userIdentity.type = Root` events provides immediate notification of any root account usage — a core CIS AWS Foundations Benchmark requirement.
- **AWS IAM Identity Center** — when using Identity Center for federated SSO, MFA is enforced at the identity provider level (Okta MFA, Azure AD Conditional Access, Identity Center's built-in MFA) rather than at the IAM user level. IAM user-level MFA configuration is less relevant in accounts where all human access flows through Identity Center federation.
- **AWS Security Hub** — the CIS AWS Foundations Benchmark standard built into Security Hub includes MFA checks: root MFA enabled (CRITICAL severity), MFA enabled for all IAM users with console access (HIGH severity). Security Hub can evaluate and score these checks continuously without requiring manual credential report downloads.
- **Amazon GuardDuty** — detects anomalous IAM activity including API calls from unexpected geographic regions, credentials used from multiple geographic locations simultaneously, disabled CloudTrail (often a precursor to malicious activity), and patterns consistent with credential theft and exfiltration. MFA reduces compromise probability; GuardDuty detects when a compromised session is being abused within its authorized scope.
- **AWS STS (Security Token Service)** — `sts:GetSessionToken` is a special STS API call that takes long-term IAM user credentials (access key ID and secret) plus an MFA code and returns temporary credentials tagged with `aws:MultiFactorAuthPresent: true`. This is the mechanism by which CLI and programmatic users can authenticate with MFA for operations that require it, even when using access keys rather than console login.

## Exam Traps

1. **SMS MFA is deprecated — do not select it as a correct answer for IAM users.** AWS discontinued SMS MFA enrollment for new IAM users. If an exam question lists virtual MFA, hardware TOTP, FIDO2, and SMS as options for protecting an IAM user, SMS is not a valid current option. (The root account can still use phone-based account recovery, but that is distinct from MFA device enrollment.)

2. **`Bool` vs. `BoolIfExists` for MFA conditions — this distinction is explicitly tested.** `Bool` fires only when the condition key is present. For credential types where `aws:MultiFactorAuthPresent` is absent (role sessions from AWS services, direct access key usage without `sts:GetSessionToken`), `Bool` would not trigger and the Deny would silently not apply. `BoolIfExists` catches both "explicitly false" and "key absent from context." Always use `BoolIfExists` for MFA enforcement.

3. **Root account MFA cannot be enforced by IAM policies or SCPs.** IAM policies do not apply to the root user. SCPs do not apply to the management account root user. The only way to protect root with MFA is to enable it directly on the root account through the Security credentials console. If root MFA is not enabled, no IAM policy can compensate for that gap.

4. **FIDO2 keys cannot be enrolled via CLI — TOTP-based MFA can.** Enrolling a FIDO2/WebAuthn security key requires a browser WebAuthn interaction. `aws iam enable-mfa-device` works for virtual and hardware TOTP devices only. An exam question about enrolling a YubiKey should point to the console, not the CLI.

5. **MFA does not protect programmatic API calls made directly with access keys.** When a CLI or SDK uses an access key to call AWS APIs, there is no interactive MFA challenge. The API call proceeds with just the key. MFA for access key-based calls requires the user to call `sts:GetSessionToken` with their access key + MFA code first, then use the resulting temporary credentials (which carry MFA context) for subsequent sensitive operations. Questions about "why does the MFA policy not protect CLI commands" — this is the answer.

## Summary

- MFA adds a second authentication factor — something you have — on top of a password or access key, requiring physical access to a specific device and dramatically increasing the cost of unauthorized access even when credentials are known.
- AWS supports four MFA types: virtual TOTP apps (most common, free, not phishing-resistant), hardware TOTP tokens (device-secure, still TOTP-relay vulnerable), FIDO2/WebAuthn hardware keys (phishing-resistant via origin-bound cryptography — the strongest option), and SMS (deprecated, do not use).
- FIDO2 keys are phishing-resistant because the key's signed response is cryptographically bound to the exact registered domain — a fake login site on a different domain cannot obtain a valid credential response from the hardware key, even in a real-time attack.
- The `BoolIfExists` condition operator with `aws:MultiFactorAuthPresent: false` is the correct way to enforce MFA in IAM policy Condition blocks — using `Bool` instead misses sessions where the MFA context key is absent entirely, leaving the Deny ineffective for those credential types.
- Root account MFA must be enabled directly on the root account — it cannot be enforced by IAM policies or SCPs — and should use a hardware FIDO2 key with credentials stored in physically secure, separate locations.
- The `NotAction` + Deny pattern allows users to register their MFA device before being blocked by MFA enforcement policies, by exempting only the minimum IAM actions needed for MFA device enrollment.

## Examples

**Beginner:** A developer creates a new AWS account for a personal project, sets a strong 16-character root password, and starts building without enabling MFA. Fourteen months later, the email address associated with the account is compromised in an unrelated data breach. An attacker uses the "Forgot Password" flow on the AWS console to reset the root password, signs in, finds a running EC2 instance, and repurposes it for cryptocurrency mining — generating a $3,400 AWS bill over three weeks before the developer notices in the billing dashboard. Had root MFA been enabled with even a basic virtual authenticator app, the password reset alone would not grant console access — the attacker would still need the MFA device. Enabling MFA immediately after account creation is the single highest-return-per-minute security action any AWS user can take.

**Intermediate:** A company with 80 IAM users wants to ensure that access to the billing console and to an S3 bucket containing financial records requires MFA — even for users already logged in with a password. The security team adds an explicit Deny statement to both the billing policy and the S3 access policy: `Effect: Deny`, the relevant actions, and a `BoolIfExists: aws:MultiFactorAuthPresent: false` condition. Users logged in without MFA can do ordinary development work but receive `AccessDenied` when they navigate to the billing dashboard or try to list the financial records bucket. To proceed, they must sign out, sign back in with their MFA device (triggering the `aws:MultiFactorAuthPresent: true` context), and try again. MFA becomes a per-resource gate without blocking anyone from normal work — exactly the outcome the security team needed.

**Advanced:** A fintech company issues YubiKey 5 NFC hardware security keys to all 12 engineers with admin-level AWS access. The decision to use FIDO2 keys over virtual MFA was driven by a documented threat model: the company is a high-value target for nation-state-level spear-phishing, and their security team has forensic evidence that a competitor was compromised via a real-time TOTP relay attack against virtual MFA. The YubiKeys are enrolled on individual IAM users via the console, registered with their user ARNs in a separate asset tracking system, and stored securely when not in use. Monthly audits use the IAM credential report to verify `mfa_active: true` for all admin users. Any admin whose MFA type is virtual (not hardware) is flagged for re-enrollment. The FIDO2 key's domain binding means even a perfect real-time phishing page cannot extract a usable credential — the threat model that compromised the competitor would not work against a FIDO2-protected account.

## Think About It

1. MFA is free, easy to set up, and dramatically reduces account compromise risk, yet organizations still routinely have users without it enabled. If the control is effectively free and the benefit is clear, what organizational and technical barriers actually prevent complete MFA adoption — and how would you systematically address them?
2. The "force MFA setup" pattern blocks all non-MFA-setup actions until a user registers their device. What operational and UX risks does this introduce — and is there a risk that making security too friction-heavy backfires by driving workarounds or help desk escalations that create worse security outcomes?
3. Virtual MFA and FIDO2 hardware keys both satisfy "something you have." Why can an attacker defeat TOTP-based MFA through a real-time phishing attack in ways that FIDO2 prevents — specifically, what property of FIDO2's design makes the attack mechanically impossible even if the user is completely deceived by the fake site?
4. The root account cannot be restricted by IAM policies or SCPs — MFA must be enabled directly. Given this, what is the complete set of available controls for protecting the root account, and given that list, how confident are you that those controls are sufficient even against a sophisticated, well-resourced attacker?
5. Applications using IAM access keys for automated processes cannot perform interactive MFA — they cannot enter a TOTP code. What is the correct architectural alternative for these use cases? Why does the presence of non-MFA-capable access keys in an account represent a broader design problem beyond just the MFA gap?

## Quick Check

**Q1.** Which MFA device type provides the strongest protection against phishing attacks targeting the AWS Management Console?

- A) Virtual MFA app (Google Authenticator) generating 30-second TOTP codes
- B) SMS text message one-time codes sent to the user's mobile phone
- C) FIDO2 hardware security key (e.g., YubiKey) using public-key cryptography with origin binding
- D) Hardware TOTP token (Gemalto) generating time-based codes without a smartphone

**Answer: C** — FIDO2/WebAuthn security keys are the only option here that is phishing-resistant. The key's signed response is cryptographically bound to the exact registered domain (`signin.aws.amazon.com`). A fake site on a different domain cannot obtain a valid credential response from the key. TOTP codes (virtual or hardware) can be intercepted and relayed within the 30-second validity window by a real-time phishing attack. SMS is deprecated and vulnerable to SIM-swapping. Only FIDO2 provides cryptographic phishing resistance.

**Q2.** Why should you use `BoolIfExists` instead of `Bool` in an IAM policy Condition that denies access when `aws:MultiFactorAuthPresent` is false?

- A) `Bool` is not a valid operator in IAM policy Condition blocks — `BoolIfExists` is the only supported boolean operator
- B) `Bool` evaluates only when the condition key exists in the request context; for credentials without MFA context (such as role sessions from AWS services), the key is absent and `Bool` would not fire, leaving the Deny ineffective
- C) `BoolIfExists` applies to both console access and API access; `Bool` applies only to console login sessions
- D) `Bool` requires a registered MFA device serial number as a parameter; `BoolIfExists` infers the device automatically

**Answer: B** — `Bool` evaluates only when the context key `aws:MultiFactorAuthPresent` is present. For some credential types — notably role sessions initiated by AWS services where MFA was not part of the authentication flow — the key is absent from the request context entirely. A `Bool` condition checking for `false` does not fire when the key is absent, leaving the Deny silent. `BoolIfExists` treats absence as the specified value (`false`), correctly blocking any session lacking MFA context.

**Q3.** Why is enabling MFA on the AWS root account more critical than enabling it on standard IAM user accounts?

- A) Root MFA is required to access billing consoles; IAM user MFA protects only resource access
- B) The root account has complete, unrestricted access that cannot be limited by IAM policies or SCPs — a compromised root account means full account compromise with no IAM-level remediation possible during the attack
- C) Root account passwords expire every 30 days, making MFA more important as an additional factor
- D) Root MFA is required to use global services like IAM and Route 53 that are not region-specific

**Answer: B** — The root account bypasses IAM policy evaluation entirely and cannot be restricted by SCPs in its management account context. A compromised root credential gives an attacker complete, unresisted control: they can delete all IAM users and roles, access all data, modify billing, and close the account. No IAM policy can protect against root compromise after the fact. The only effective protection is preventing compromise in the first place, and MFA is the most important preventive control for the account login.

## What's Next

Next: AWS Organizations — how to manage multiple AWS accounts under centralized governance, apply permission guardrails across all accounts simultaneously using SCPs, and use account-level isolation as a security and operational boundary.
