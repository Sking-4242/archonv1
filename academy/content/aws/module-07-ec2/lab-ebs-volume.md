---
title: "Lab: Attach and Resize an EBS Volume"
type: canvas
estimated_minutes: 25
cert_tags: ["aws_saa", "aws_soa"]
---

# Lab: Attach and Resize an EBS Volume

## Challenge

In this lab you'll attach a new EBS gp3 volume to the EC2 instance from the previous lab, format and mount it, verify data persistence through a reboot, and expand the volume without stopping the instance.

## Learning Objectives

- Create and attach an EBS volume to an EC2 instance
- Format, mount, and write data to the new volume
- Verify the volume persists through instance reboot
- Expand the EBS volume live (online) without stopping the instance
- Diagram the attached volume in Archon

## Steps

1. In EC2 → Volumes → Create Volume: gp3, 10 GiB, same AZ as your EC2 instance
2. Select the volume → Actions → Attach Volume → choose your instance
3. SSH to the instance, run `lsblk` to see the new device (likely /dev/xvdf or /dev/nvme1n1)
4. Format: `sudo mkfs.ext4 /dev/xvdf` (use actual device name from lsblk)
5. Mount: `sudo mkdir /data && sudo mount /dev/xvdf /data && echo 'hello EBS' | sudo tee /data/test.txt`
6. Make mount persistent: add to /etc/fstab using UUID (`sudo blkid` to get UUID, then edit fstab)
7. Reboot the instance and verify /data/test.txt still exists after reboot
8. Expand the volume: in EC2 → Volumes, select your volume → Modify Volume → change size to 20 GiB
9. On the instance: `sudo growpart /dev/xvdf 1` then `sudo resize2fs /dev/xvdf1` to expand the filesystem
10. Run `df -h /data` to confirm the filesystem now shows 20 GiB
11. Update your Archon diagram to show the expanded volume with the mount point labeled

## Archon Canvas Lab

Open the Archon canvas to diagram the architecture you built. Label EC2 instance types, EBS volumes, security group rules, and VPC configuration.
