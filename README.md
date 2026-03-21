# ASG Orchestrator 🚀

## Overview
An Auto Scaling Orchestrator that dynamically scales EC2 instances 
based on load and distributes traffic using AWS Load Balancer.

## Architecture
User Traffic → Load Balancer → Auto Scaling Group → EC2 Instances

## Tech Stack
- AWS EC2
- Auto Scaling Groups
- Load Balancer
- AWS SDK (Node.js)

## Features
- Dynamic scaling based on load
- Load distribution across instances
- Fault tolerance

## Flow
1. Create AMI from base VM
2. Create Launch Template
3. Attach ASG
4. Attach Load Balancer
5. Scale based on metrics

## Future Improvements
- Add CloudWatch metrics automation
- CI/CD pipeline
- Infrastructure as Code (Terraform)
