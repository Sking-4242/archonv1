---
title: "Lab: Create Your AWS Account"
type: canvas
estimated_minutes: 20
cert_tags: ["aws_ccp"]
---

# Lab: Create Your AWS Account

## Challenge

In this lab you will set up the AWS account you'll use throughout this course. A properly configured AWS account — with MFA enabled on the root user, a billing alert, and an IAM admin user — is the foundation for safe learning. Skipping these steps leads to security risks and unexpected charges.

After completing this lab, you will have a secure, cost-monitored AWS account ready for every lab that follows.

## Learning Objectives

- Create a new AWS account (or verify an existing one is properly configured)
- Enable MFA on the root account user
- Create an IAM admin user and log in with it (never use root for day-to-day work)
- Set up a billing alarm so you're notified if charges exceed a threshold
- Navigate the AWS Management Console and understand its key sections

## Steps

1. Go to aws.amazon.com and sign up for a new account (use a fresh email address if possible; the free tier applies to new accounts)
2. Complete verification: provide a credit card (free tier won't charge you for most labs) and phone number
3. Log in as root, go to IAM, and enable MFA for the root user using an authenticator app
4. In IAM, create a new user group called 'Admins' and attach the AdministratorAccess managed policy
5. Create an IAM user (your name or 'admin'), add it to the Admins group, and enable console access with a strong password
6. Log out of root, log in as your IAM user — this is the account you'll use for all future labs
7. Go to Billing → Billing Preferences and enable billing alerts
8. Go to CloudWatch → Alarms and create an alarm that notifies your email when estimated charges exceed $10/month
9. Explore the console: find the region selector (top right), the services menu, and your account ID
10. Open the Archon canvas and diagram your new account structure: root user, IAM admin user, admin group, and billing alarm

## Archon Canvas Lab

Open the Archon canvas to diagram the architecture you built or will build in this lab. Use the Archon component library to place and connect AWS services. Label each resource with its configuration details.
