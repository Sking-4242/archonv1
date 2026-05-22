---
title: "App Engine: Standard vs. Flexible"
type: content
estimated_minutes: 9
cert_tags: ["ace", "pca"]
---

# App Engine: Standard vs. Flexible

## Overview

Before Cloud Run existed, Google launched **App Engine** (in 2008). It was one of the first Platform as a Service (PaaS) offerings in the world. While Cloud Run is the modern standard for containers, App Engine is still heavily used for code-first deployments where the development team does not know (or want to know) how to write a Dockerfile.

## Code-First Deployment

With App Engine, you do not build containers. You write your source code (Python, Java, Node.js, Go), and you type a single command: `gcloud app deploy`. 
Google takes your raw source code, provisions the underlying virtual machines, installs the language runtimes, configures the load balancer, and binds the SSL certificates. 

## Standard Environment vs. Flexible Environment

If an architect chooses App Engine, they must immediately decide which environment the application will run in. This is a guaranteed exam topic.

**1. App Engine Standard**
* **Architecture:** Your code runs inside a highly restricted, secure sandbox managed by Google. 
* **Scaling:** Because the sandbox is lightweight, it scales up instantly (milliseconds) and scales down to zero when idle. 
* **Constraints:** You cannot install custom third-party operating system binaries (like a custom C++ image processing library). You are restricted to the specific versions of languages Google supports. You cannot SSH into the underlying instances.

**2. App Engine Flexible**
* **Architecture:** Google takes your code, dynamically builds a Docker container for you behind the scenes, and runs it on Compute Engine Virtual Machines.
* **Scaling:** Because it relies on underlying VMs, scaling up takes minutes (not milliseconds), and **it cannot scale to zero**. You must always have at least one VM running, meaning you constantly accrue OpEx costs.
* **Flexibility:** Because it's a VM, you can run custom background threads, install any third-party OS package, and even SSH into the instance for troubleshooting.

## Summary

App Engine is a code-first PaaS offering that abstracts away infrastructure entirely. The Standard environment provides millisecond scaling and zero-cost idling, but enforces strict runtime sandboxes. The Flexible environment utilizes underlying Virtual Machines, allowing custom OS packages and background threads, but sacrifices instantaneous scaling and incurs continuous billing.