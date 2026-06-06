---
title: "Canvas Lab: Launch and Connect to an RDS MySQL Instance"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "CLF-C02"]
canvas_type: starter
---

# Canvas Lab: Launch and Connect to an RDS MySQL Instance

## Challenge

A development team is building a new web application and needs a managed MySQL database in a private subnet. An EC2 instance in a public subnet will serve as the application tier. You need to launch an RDS MySQL 8.0 instance inside a DB subnet group, configure security groups so that only the EC2 instance can reach the database on port 3306, connect from EC2 via the MySQL client, and verify that automated backups are enabled — simulating a real application-to-database connectivity setup.

## Learning Objectives

- Create a DB subnet group using private subnets to ensure the RDS instance is not publicly accessible
- Configure security groups with least-privilege rules allowing EC2-to-RDS traffic on port 3306 only
- Connect to an RDS MySQL instance from an EC2 instance using the RDS endpoint hostname (not an IP address)
- Execute basic SQL commands to verify database connectivity and create a sample schema
- Enable and verify automated backups and understand the RDS backup retention window

## Steps

1. In the VPC console, confirm you have at least two private subnets in different Availability Zones — note their subnet IDs (create them if needed using non-routable CIDR blocks with no route to an Internet Gateway)
2. Navigate to **RDS → Subnet Groups → Create DB subnet group** — name it `app-db-subnet-group`, select your VPC, and add both private subnets
3. Navigate to **EC2 → Security Groups → Create security group** — name it `ec2-app-sg`, allow inbound TCP port 22 from your IP address only; leave outbound as default (all traffic)
4. Create a second security group named `rds-mysql-sg` — add one inbound rule: TCP port 3306, source = `ec2-app-sg` (reference the SG ID, not a CIDR); this ensures only the EC2 instance can reach RDS
5. Navigate to **RDS → Databases → Create database** — choose **Standard Create**, engine **MySQL 8.0**, template **Free tier** (or Dev/Test), instance class **db.t3.micro**
6. Under **Connectivity**: select your VPC, select `app-db-subnet-group`, set **Public access = No**, assign `rds-mysql-sg`; under **Additional configuration** set initial database name to `appdb` and confirm automated backups are enabled with a 7-day retention window
7. Launch a **t3.micro EC2 instance** (Amazon Linux 2023) in a public subnet of the same VPC — assign `ec2-app-sg`; create or use an existing key pair; confirm the instance has a public IP
8. SSH into the EC2 instance: `ssh -i your-key.pem ec2-user@<EC2-PUBLIC-IP>`
9. Install the MySQL client: `sudo dnf install -y mariadb105` (Amazon Linux 2023) or `sudo yum install -y mysql` (Amazon Linux 2)
10. Connect to RDS using the endpoint: `mysql -h <RDS-ENDPOINT> -u admin -p` — enter the master password you set during creation; confirm you see the `mysql>` prompt
11. Run the following SQL to verify connectivity and create a test table: `SHOW DATABASES; USE appdb; CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP); INSERT INTO users (name) VALUES ('test-user'); SELECT * FROM users;`
12. Return to the RDS console and confirm the **Maintenance & backups** tab shows an automated backup window and that a snapshot was created; note that the endpoint hostname remains stable even if the underlying instance is replaced

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
