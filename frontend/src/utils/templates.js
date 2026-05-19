/**
 * Architecture templates — 15 per provider (AWS, Azure, GCP, On-Prem).
 */

function nd(id, type, x, y, label, cloudType, icon, category, extra = {}) {
  const isContainer = ["vpc", "subnet"].includes(type);
  return {
    id,
    type,
    position: { x, y },
    zIndex: type === "vpc" ? 0 : type === "subnet" ? 1 : 2,
    ...(isContainer ? { style: extra.style ?? { width: 360, height: 200 } } : {}),
    data: {
      label,
      awsType: cloudType,
      icon,
      category,
      config: extra.config ?? {},
      security_group_ids: extra.sg ?? [],
      iam_role_id: extra.iam ?? null,
      subnet_id: extra.subnet_id ?? null,
      vpc_id: extra.vpc_id ?? null,
      instructions: extra.instructions ?? "",
    },
  };
}

function ed(id, source, target, type = "network", bidirectional = false) {
  return { id, source, target, type, data: { bidirectional }, suggested_rules: [] };
}

// ═══════════════════════════════════════════════════════════════
//  AWS TEMPLATES (15)
// ═══════════════════════════════════════════════════════════════

const aws1 = {
  id: "tpl-3tier", name: "3-Tier Web App", category: "Web",
  description: "Internet Gateway → ALB → EC2 (private) → RDS. Classic load-balanced web application with VPC and public/private subnets.",
  nodes: [
    nd("t1-vpc","vpc",50,50,"Production VPC","VPC","🌐","networking",{style:{width:680,height:420},config:{cidr_block:"10.0.0.0/16"}}),
    nd("t1-pub","subnet",80,120,"Public Subnet","Subnet","🔲","networking",{style:{width:280,height:140},config:{cidr_block:"10.0.1.0/24",public:true},vpc_id:"t1-vpc"}),
    nd("t1-priv","subnet",400,120,"Private Subnet","Subnet","🔲","networking",{style:{width:280,height:140},config:{cidr_block:"10.0.2.0/24",public:false},vpc_id:"t1-vpc"}),
    nd("t1-igw","internet_gateway",340,-80,"Internet Gateway","Internet Gateway","🌍","networking"),
    nd("t1-nat","nat_gateway",120,320,"NAT Gateway","NAT Gateway","🔀","networking",{config:{connectivity_type:"public"}}),
    nd("t1-alb","alb",180,160,"App Load Balancer","ALB","⚡","load_balancing",{subnet_id:"t1-pub",vpc_id:"t1-vpc",config:{scheme:"internet-facing"}}),
    nd("t1-ec2","ec2",450,160,"Web Server","EC2","🖥️","compute",{subnet_id:"t1-priv",vpc_id:"t1-vpc",config:{instance_type:"t3.small"}}),
    nd("t1-rds","rds",450,370,"Primary DB","RDS","🗄️","database",{subnet_id:"t1-priv",vpc_id:"t1-vpc",config:{engine:"mysql",instance_class:"db.t3.micro",multi_az:false}}),
  ],
  edges: [
    ed("t1-e1","t1-igw","t1-alb"),ed("t1-e2","t1-alb","t1-ec2"),
    ed("t1-e3","t1-ec2","t1-rds"),ed("t1-e4","t1-ec2","t1-nat","network"),
  ],
  graphMeta: { name:"3-Tier Web App", provider:"aws", region:"us-east-1" },
};

const aws2 = {
  id: "tpl-serverless", name: "Serverless Event Pipeline", category: "Serverless",
  description: "EventBridge rule triggers Lambda, fans out to SQS queue and S3, with DynamoDB for state. Fully serverless.",
  nodes: [
    nd("t2-eb","eventbridge",100,200,"Scheduled Rule","EventBridge","🌉","integration",{config:{schedule_expression:"rate(5 minutes)"}}),
    nd("t2-lam1","lambda",320,200,"Processor","Lambda","λ","compute",{config:{runtime:"python3.12",memory_size:512,timeout:30}}),
    nd("t2-sqs","sqs",540,120,"Work Queue","SQS","📬","integration",{config:{fifo_queue:false}}),
    nd("t2-lam2","lambda",760,120,"Consumer","Lambda","λ","compute",{config:{runtime:"python3.12",memory_size:256,timeout:60}}),
    nd("t2-s3","s3",540,300,"Results Bucket","S3","🪣","storage",{config:{versioning:false}}),
    nd("t2-ddb","dynamodb",760,300,"State Table","DynamoDB","⚡","database",{config:{billing_mode:"PAY_PER_REQUEST",hash_key:"id"}}),
    nd("t2-sns","sns",980,200,"Notifications","SNS","📣","integration"),
  ],
  edges: [
    ed("t2-e1","t2-eb","t2-lam1","dataflow"),ed("t2-e2","t2-lam1","t2-sqs","dataflow"),
    ed("t2-e3","t2-sqs","t2-lam2","dataflow"),ed("t2-e4","t2-lam1","t2-s3","dataflow"),
    ed("t2-e5","t2-lam2","t2-ddb","dataflow"),ed("t2-e6","t2-lam2","t2-sns","dataflow"),
  ],
  graphMeta: { name:"Serverless Event Pipeline", provider:"aws", region:"us-east-1" },
};

const aws3 = {
  id: "tpl-vpc", name: "VPC Foundation", category: "Networking",
  description: "Production-ready VPC with public and private subnets, Internet Gateway, NAT Gateway, and Elastic IP.",
  nodes: [
    nd("t3-vpc","vpc",50,50,"Production VPC","VPC","🌐","networking",{style:{width:680,height:400},config:{cidr_block:"10.0.0.0/16",enable_dns_support:true,enable_dns_hostnames:true}}),
    nd("t3-pub1","subnet",80,120,"Public Subnet AZ-1","Subnet","🔲","networking",{style:{width:270,height:130},config:{cidr_block:"10.0.1.0/24",availability_zone:"us-east-1a",public:true},vpc_id:"t3-vpc"}),
    nd("t3-pub2","subnet",390,120,"Public Subnet AZ-2","Subnet","🔲","networking",{style:{width:270,height:130},config:{cidr_block:"10.0.2.0/24",availability_zone:"us-east-1b",public:true},vpc_id:"t3-vpc"}),
    nd("t3-priv","subnet",80,290,"Private Subnet","Subnet","🔲","networking",{style:{width:580,height:130},config:{cidr_block:"10.0.3.0/24",availability_zone:"us-east-1a",public:false},vpc_id:"t3-vpc"}),
    nd("t3-igw","internet_gateway",360,-80,"Internet Gateway","Internet Gateway","🌍","networking"),
    nd("t3-eip","elastic_ip",800,-80,"NAT EIP","Elastic IP","📌","networking",{config:{domain:"vpc"}}),
    nd("t3-nat","nat_gateway",140,165,"NAT Gateway","NAT Gateway","🔀","networking",{config:{connectivity_type:"public"}}),
    nd("t3-rt1","route_table",490,-80,"Public Route Table","Route Table","🗺️","networking"),
    nd("t3-rt2","route_table",640,-80,"Private Route Table","Route Table","🗺️","networking"),
  ],
  edges: [
    ed("t3-e1","t3-igw","t3-rt1","dependency"),ed("t3-e2","t3-eip","t3-nat","dependency"),
    ed("t3-e3","t3-nat","t3-rt2","dependency"),ed("t3-e4","t3-rt1","t3-pub1","dependency"),
    ed("t3-e5","t3-rt1","t3-pub2","dependency"),ed("t3-e6","t3-rt2","t3-priv","dependency"),
  ],
  graphMeta: { name:"VPC Foundation", provider:"aws", region:"us-east-1" },
};

const aws4 = {
  id: "tpl-ha-cache", name: "HA Web App + Cache", category: "Web",
  description: "ALB → Auto Scaling EC2 → ElastiCache (Redis) + RDS Multi-AZ. Horizontally scalable with caching and HA database.",
  nodes: [
    nd("t4-vpc","vpc",50,50,"Production VPC","VPC","🌐","networking",{style:{width:800,height:460},config:{cidr_block:"10.0.0.0/16"}}),
    nd("t4-pub","subnet",80,120,"Public Subnet","Subnet","🔲","networking",{style:{width:300,height:140},config:{cidr_block:"10.0.1.0/24",public:true},vpc_id:"t4-vpc"}),
    nd("t4-priv","subnet",430,120,"Private Subnet","Subnet","🔲","networking",{style:{width:380,height:140},config:{cidr_block:"10.0.2.0/24",public:false},vpc_id:"t4-vpc"}),
    nd("t4-igw","internet_gateway",400,-80,"Internet Gateway","Internet Gateway","🌍","networking"),
    nd("t4-alb","alb",180,160,"App Load Balancer","ALB","⚡","load_balancing",{subnet_id:"t4-pub",vpc_id:"t4-vpc",config:{scheme:"internet-facing"}}),
    nd("t4-asg","auto_scaling_group",480,160,"Web Tier ASG","Auto Scaling Group","⚖️","compute",{subnet_id:"t4-priv",vpc_id:"t4-vpc",config:{min_size:2,max_size:6,desired_capacity:2}}),
    nd("t4-redis","elasticache",480,330,"Redis Cache","ElastiCache","🚀","database",{subnet_id:"t4-priv",vpc_id:"t4-vpc",config:{engine:"redis",node_type:"cache.t3.micro"}}),
    nd("t4-rds","rds",680,330,"Primary DB","RDS","🗄️","database",{subnet_id:"t4-priv",vpc_id:"t4-vpc",config:{engine:"postgres",instance_class:"db.t3.small",multi_az:true}}),
    nd("t4-kms","kms_key",900,300,"Encryption Key","KMS Key","🔐","security"),
  ],
  edges: [
    ed("t4-e1","t4-igw","t4-alb"),ed("t4-e2","t4-alb","t4-asg"),
    ed("t4-e3","t4-asg","t4-redis","network"),ed("t4-e4","t4-asg","t4-rds"),
    ed("t4-e5","t4-rds","t4-kms","dependency"),ed("t4-e6","t4-redis","t4-kms","dependency"),
  ],
  graphMeta: { name:"HA Web App + Cache", provider:"aws", region:"us-east-1" },
};

const aws5 = {
  id: "tpl-analytics", name: "Event-Driven Analytics", category: "Data",
  description: "SNS fan-out to SQS queues, Lambda processors write to DynamoDB and S3 data lake. Multiple parallel processing paths.",
  nodes: [
    nd("t5-sns","sns",300,80,"Ingest Topic","SNS","📣","integration"),
    nd("t5-sqs1","sqs",100,250,"Processing Queue","SQS","📬","integration",{config:{visibility_timeout_seconds:300}}),
    nd("t5-sqs2","sqs",500,250,"Analytics Queue","SQS","📬","integration",{config:{visibility_timeout_seconds:300}}),
    nd("t5-lam1","lambda",100,420,"Record Processor","Lambda","λ","compute",{config:{runtime:"python3.12",memory_size:512,timeout:300}}),
    nd("t5-lam2","lambda",500,420,"Analytics Writer","Lambda","λ","compute",{config:{runtime:"python3.12",memory_size:1024,timeout:300}}),
    nd("t5-ddb","dynamodb",-80,580,"Records Table","DynamoDB","⚡","database",{config:{billing_mode:"PAY_PER_REQUEST",hash_key:"pk",range_key:"sk"}}),
    nd("t5-s3","s3",300,580,"Data Lake","S3","🪣","storage",{config:{versioning:true,server_side_encryption:"AES256"}}),
    nd("t5-eb","eventbridge",740,80,"Schedule","EventBridge","🌉","integration"),
    nd("t5-kms","kms_key",300,-80,"Data Key","KMS Key","🔐","security"),
  ],
  edges: [
    ed("t5-e1","t5-sns","t5-sqs1","dataflow"),ed("t5-e2","t5-sns","t5-sqs2","dataflow"),
    ed("t5-e3","t5-sqs1","t5-lam1","dataflow"),ed("t5-e4","t5-sqs2","t5-lam2","dataflow"),
    ed("t5-e5","t5-lam1","t5-ddb","dataflow"),ed("t5-e6","t5-lam1","t5-s3","dataflow"),
    ed("t5-e7","t5-lam2","t5-s3","dataflow"),ed("t5-e8","t5-eb","t5-lam2","dataflow"),
    ed("t5-e9","t5-s3","t5-kms","dependency"),
  ],
  graphMeta: { name:"Event-Driven Analytics", provider:"aws", region:"us-east-1" },
};

const aws6 = {
  id: "tpl-eks", name: "EKS Microservices", category: "Containers",
  description: "ALB Ingress → EKS cluster with private node groups, ECR registry, RDS backend, and Secrets Manager.",
  nodes: [
    nd("a6-vpc","vpc",50,50,"Platform VPC","VPC","🌐","networking",{style:{width:820,height:480},config:{cidr_block:"10.0.0.0/16"}}),
    nd("a6-pub","subnet",80,120,"Public Subnet","Subnet","🔲","networking",{style:{width:300,height:130},config:{cidr_block:"10.0.1.0/24",public:true},vpc_id:"a6-vpc"}),
    nd("a6-priv","subnet",430,120,"Private Subnet","Subnet","🔲","networking",{style:{width:380,height:130},config:{cidr_block:"10.0.2.0/24",public:false},vpc_id:"a6-vpc"}),
    nd("a6-igw","internet_gateway",400,-80,"Internet Gateway","Internet Gateway","🌍","networking"),
    nd("a6-alb","alb",180,160,"Ingress ALB","ALB","⚡","load_balancing",{subnet_id:"a6-pub",vpc_id:"a6-vpc",config:{scheme:"internet-facing"}}),
    nd("a6-eks","eks",500,160,"EKS Cluster","EKS","☸️","compute",{subnet_id:"a6-priv",vpc_id:"a6-vpc",config:{kubernetes_version:"1.30"}}),
    nd("a6-ecr","ecr",500,330,"Container Registry","ECR","📦","devops",{config:{image_tag_mutability:"IMMUTABLE"}}),
    nd("a6-rds","rds",720,330,"App Database","RDS","🗄️","database",{subnet_id:"a6-priv",vpc_id:"a6-vpc",config:{engine:"postgres",instance_class:"db.t3.medium",multi_az:true}}),
    nd("a6-sec","secretsmanager",940,200,"DB Credentials","Secrets Manager","🔑","security"),
    nd("a6-kms","kms_key",940,350,"Cluster Key","KMS Key","🔐","security"),
  ],
  edges: [
    ed("a6-e1","a6-igw","a6-alb"),ed("a6-e2","a6-alb","a6-eks"),
    ed("a6-e3","a6-eks","a6-ecr","dependency"),ed("a6-e4","a6-eks","a6-rds"),
    ed("a6-e5","a6-eks","a6-sec","dependency"),ed("a6-e6","a6-rds","a6-kms","dependency"),
  ],
  graphMeta: { name:"EKS Microservices", provider:"aws", region:"us-east-1" },
};

const aws7 = {
  id: "tpl-secure-api", name: "Secure Serverless API", category: "Serverless",
  description: "Cognito auth → API Gateway → Lambda handlers → DynamoDB + Secrets Manager. JWT-secured REST API with no servers.",
  nodes: [
    nd("a7-cog","cognito",80,200,"User Pool","Cognito","👤","security",{config:{user_pool_name:"app-users"}}),
    nd("a7-apigw","api_gateway",300,200,"REST API","API Gateway","🚪","networking",{config:{endpoint_type:"REGIONAL"}}),
    nd("a7-lam1","lambda",520,120,"Auth Handler","Lambda","λ","compute",{config:{runtime:"nodejs20.x",memory_size:256,timeout:10}}),
    nd("a7-lam2","lambda",520,280,"Business Logic","Lambda","λ","compute",{config:{runtime:"python3.12",memory_size:512,timeout:30}}),
    nd("a7-ddb","dynamodb",740,200,"App Table","DynamoDB","⚡","database",{config:{billing_mode:"PAY_PER_REQUEST",hash_key:"pk",range_key:"sk"}}),
    nd("a7-sec","secretsmanager",740,360,"App Secrets","Secrets Manager","🔑","security"),
    nd("a7-cw","cloudwatch",960,200,"Metrics","CloudWatch","📊","monitoring"),
  ],
  edges: [
    ed("a7-e1","a7-cog","a7-apigw","dependency"),ed("a7-e2","a7-apigw","a7-lam1","dataflow"),
    ed("a7-e3","a7-apigw","a7-lam2","dataflow"),ed("a7-e4","a7-lam2","a7-ddb","dataflow"),
    ed("a7-e5","a7-lam2","a7-sec","dependency"),ed("a7-e6","a7-lam2","a7-cw","dependency"),
  ],
  graphMeta: { name:"Secure Serverless API", provider:"aws", region:"us-east-1" },
};

const aws8 = {
  id: "tpl-ecs", name: "ECS Fargate Platform", category: "Containers",
  description: "ALB → ECS Fargate tasks with ECR images, RDS backend, and Secrets Manager credentials. Zero-EC2 container platform.",
  nodes: [
    nd("a8-vpc","vpc",50,50,"App VPC","VPC","🌐","networking",{style:{width:780,height:440},config:{cidr_block:"10.0.0.0/16"}}),
    nd("a8-pub","subnet",80,120,"Public Subnet","Subnet","🔲","networking",{style:{width:280,height:130},config:{cidr_block:"10.0.1.0/24",public:true},vpc_id:"a8-vpc"}),
    nd("a8-priv","subnet",410,120,"Private Subnet","Subnet","🔲","networking",{style:{width:380,height:130},config:{cidr_block:"10.0.2.0/24",public:false},vpc_id:"a8-vpc"}),
    nd("a8-igw","internet_gateway",380,-80,"Internet Gateway","Internet Gateway","🌍","networking"),
    nd("a8-alb","alb",170,160,"Load Balancer","ALB","⚡","load_balancing",{subnet_id:"a8-pub",vpc_id:"a8-vpc",config:{scheme:"internet-facing"}}),
    nd("a8-ecs","ecs_fargate",470,160,"Fargate Service","ECS Fargate","🐳","compute",{subnet_id:"a8-priv",vpc_id:"a8-vpc",config:{cpu:512,memory:1024}}),
    nd("a8-ecr","ecr",700,80,"Image Registry","ECR","📦","devops"),
    nd("a8-rds","rds",700,300,"Database","RDS","🗄️","database",{subnet_id:"a8-priv",vpc_id:"a8-vpc",config:{engine:"postgres",instance_class:"db.t3.small",multi_az:true}}),
    nd("a8-sec","secretsmanager",920,200,"Secrets","Secrets Manager","🔑","security"),
  ],
  edges: [
    ed("a8-e1","a8-igw","a8-alb"),ed("a8-e2","a8-alb","a8-ecs"),
    ed("a8-e3","a8-ecs","a8-ecr","dependency"),ed("a8-e4","a8-ecs","a8-rds"),
    ed("a8-e5","a8-ecs","a8-sec","dependency"),
  ],
  graphMeta: { name:"ECS Fargate Platform", provider:"aws", region:"us-east-1" },
};

const aws9 = {
  id: "tpl-streaming", name: "Real-Time Streaming", category: "Data",
  description: "Kinesis Data Stream → Lambda consumer → DynamoDB + S3. Real-time event processing with durable storage.",
  nodes: [
    nd("a9-kin","kinesis",100,200,"Event Stream","Kinesis","🌊","analytics",{config:{shard_count:2,retention_period:24}}),
    nd("a9-lam1","lambda",320,200,"Stream Processor","Lambda","λ","compute",{config:{runtime:"python3.12",memory_size:512,timeout:60}}),
    nd("a9-ddb","dynamodb",540,120,"Hot Table","DynamoDB","⚡","database",{config:{billing_mode:"PAY_PER_REQUEST",hash_key:"event_id"}}),
    nd("a9-s3","s3",540,300,"Archive Bucket","S3","🪣","storage",{config:{versioning:false}}),
    nd("a9-lam2","lambda",760,200,"Enricher","Lambda","λ","compute",{config:{runtime:"python3.12",memory_size:256,timeout:30}}),
    nd("a9-sns","sns",960,200,"Alert Topic","SNS","📣","integration"),
    nd("a9-cw","cloudwatch",100,380,"Stream Metrics","CloudWatch","📊","monitoring"),
  ],
  edges: [
    ed("a9-e1","a9-kin","a9-lam1","streaming"),ed("a9-e2","a9-lam1","a9-ddb","dataflow"),
    ed("a9-e3","a9-lam1","a9-s3","dataflow"),ed("a9-e4","a9-ddb","a9-lam2","dataflow"),
    ed("a9-e5","a9-lam2","a9-sns","dataflow"),ed("a9-e6","a9-kin","a9-cw","dependency"),
  ],
  graphMeta: { name:"Real-Time Streaming", provider:"aws", region:"us-east-1" },
};

const aws10 = {
  id: "tpl-ml", name: "ML Training Pipeline", category: "AI/ML",
  description: "S3 data lake → Glue ETL → SageMaker training → model artifacts → Lambda inference endpoint.",
  nodes: [
    nd("a10-s3raw","s3",80,200,"Training Data","S3","🪣","storage",{config:{versioning:true,server_side_encryption:"AES256"}}),
    nd("a10-glue","glue",280,200,"Data Prep","Glue","🔧","analytics",{config:{glue_version:"4.0"}}),
    nd("a10-sm","sagemaker",500,200,"Training Job","SageMaker","🧠","ai_ml",{config:{instance_type:"ml.p3.2xlarge"}}),
    nd("a10-s3mod","s3",720,200,"Model Artifacts","S3","🪣","storage"),
    nd("a10-lam","lambda",940,200,"Inference Fn","Lambda","λ","compute",{config:{runtime:"python3.12",memory_size:1024,timeout:60}}),
    nd("a10-cw","cloudwatch",720,360,"Training Metrics","CloudWatch","📊","monitoring"),
    nd("a10-kms","kms_key",500,380,"Model Key","KMS Key","🔐","security"),
  ],
  edges: [
    ed("a10-e1","a10-s3raw","a10-glue","dataflow"),ed("a10-e2","a10-glue","a10-sm","dataflow"),
    ed("a10-e3","a10-sm","a10-s3mod","dataflow"),ed("a10-e4","a10-s3mod","a10-lam","dependency"),
    ed("a10-e5","a10-sm","a10-cw","dependency"),ed("a10-e6","a10-s3mod","a10-kms","dependency"),
  ],
  graphMeta: { name:"ML Training Pipeline", provider:"aws", region:"us-east-1" },
};

const aws11 = {
  id: "tpl-datalake", name: "Data Lake & ETL", category: "Data",
  description: "S3 raw zone → Glue ETL → S3 curated zone → Athena queries → QuickSight dashboards. Serverless analytics.",
  nodes: [
    nd("a11-s3r","s3",80,200,"Raw Zone","S3","🪣","storage",{config:{versioning:true}}),
    nd("a11-glue","glue",280,200,"ETL Jobs","Glue","🔧","analytics",{config:{glue_version:"4.0"}}),
    nd("a11-s3c","s3",480,200,"Curated Zone","S3","🪣","storage",{config:{versioning:true,server_side_encryption:"AES256"}}),
    nd("a11-ath","athena",680,200,"Query Engine","Athena","🔍","analytics",{config:{output_location:"s3://query-results/"}}),
    nd("a11-qs","quicksight",880,200,"Dashboards","QuickSight","📊","analytics"),
    nd("a11-lf","lakeformation",480,380,"Governance","Lake Formation","🏛️","security"),
    nd("a11-kms","kms_key",280,380,"Data Key","KMS Key","🔐","security"),
  ],
  edges: [
    ed("a11-e1","a11-s3r","a11-glue","batch"),ed("a11-e2","a11-glue","a11-s3c","dataflow"),
    ed("a11-e3","a11-s3c","a11-ath","dataflow"),ed("a11-e4","a11-ath","a11-qs","dataflow"),
    ed("a11-e5","a11-s3c","a11-lf","dependency"),ed("a11-e6","a11-s3c","a11-kms","dependency"),
  ],
  graphMeta: { name:"Data Lake & ETL", provider:"aws", region:"us-east-1" },
};

const aws12 = {
  id: "tpl-cicd", name: "CI/CD Pipeline", category: "DevOps",
  description: "CodeCommit → CodePipeline → CodeBuild → ECR → ECS Fargate deploy. Fully managed AWS-native CI/CD.",
  nodes: [
    nd("a12-cc","codecommit",80,200,"Source Repo","CodeCommit","📁","devops"),
    nd("a12-cp","codepipeline",280,200,"Pipeline","CodePipeline","🔄","devops"),
    nd("a12-cb","codebuild",480,120,"Build Stage","CodeBuild","🔨","devops",{config:{build_timeout:60}}),
    nd("a12-ecr","ecr",480,300,"Image Registry","ECR","📦","devops"),
    nd("a12-cd","codedeploy",680,200,"Deploy Stage","CodeDeploy","🚀","devops"),
    nd("a12-ecs","ecs_fargate",880,200,"Production","ECS Fargate","🐳","compute",{config:{cpu:512,memory:1024}}),
    nd("a12-cw","cloudwatch",680,380,"Pipeline Logs","CloudWatch","📊","monitoring"),
  ],
  edges: [
    ed("a12-e1","a12-cc","a12-cp","dependency"),ed("a12-e2","a12-cp","a12-cb","dependency"),
    ed("a12-e3","a12-cb","a12-ecr","dataflow"),ed("a12-e4","a12-cp","a12-cd","dependency"),
    ed("a12-e5","a12-cd","a12-ecs","dependency"),ed("a12-e6","a12-cd","a12-cw","dependency"),
  ],
  graphMeta: { name:"CI/CD Pipeline", provider:"aws", region:"us-east-1" },
};

const aws13 = {
  id: "tpl-global-cdn", name: "Global Content Delivery", category: "Networking",
  description: "Route 53 → CloudFront with WAF → ALB origin + S3 static assets. HTTPS-enforced global CDN with DDoS protection.",
  nodes: [
    nd("a13-r53","route53",80,200,"DNS","Route 53","🌐","networking"),
    nd("a13-cf","cloudfront",280,200,"CDN","CloudFront","⚡","networking",{config:{price_class:"PriceClass_100"}}),
    nd("a13-waf","waf",280,380,"Web ACL","WAF","🛡️","security"),
    nd("a13-s3","s3",480,120,"Static Assets","S3","🪣","storage",{config:{versioning:true}}),
    nd("a13-alb","alb",480,280,"Origin ALB","ALB","⚡","load_balancing",{config:{scheme:"internet-facing"}}),
    nd("a13-acm","acm",680,200,"TLS Cert","ACM","🔒","security"),
    nd("a13-ec2","ec2",680,360,"App Servers","EC2","🖥️","compute",{config:{instance_type:"t3.medium"}}),
  ],
  edges: [
    ed("a13-e1","a13-r53","a13-cf"),ed("a13-e2","a13-cf","a13-waf","dependency"),
    ed("a13-e3","a13-cf","a13-s3","dataflow"),ed("a13-e4","a13-cf","a13-alb"),
    ed("a13-e5","a13-cf","a13-acm","dependency"),ed("a13-e6","a13-alb","a13-ec2"),
  ],
  graphMeta: { name:"Global Content Delivery", provider:"aws", region:"us-east-1" },
};

const aws14 = {
  id: "tpl-aurora", name: "Aurora Multi-AZ Database", category: "Database",
  description: "Aurora cluster with Multi-AZ replicas, KMS encryption, Secrets Manager rotation, and CloudWatch alarms.",
  nodes: [
    nd("a14-vpc","vpc",50,50,"DB VPC","VPC","🌐","networking",{style:{width:700,height:380},config:{cidr_block:"10.0.0.0/16"}}),
    nd("a14-priv1","subnet",80,120,"DB Subnet AZ-1","Subnet","🔲","networking",{style:{width:260,height:120},config:{cidr_block:"10.0.1.0/24",availability_zone:"us-east-1a",public:false},vpc_id:"a14-vpc"}),
    nd("a14-priv2","subnet",380,120,"DB Subnet AZ-2","Subnet","🔲","networking",{style:{width:260,height:120},config:{cidr_block:"10.0.2.0/24",availability_zone:"us-east-1b",public:false},vpc_id:"a14-vpc"}),
    nd("a14-aur","aurora",200,310,"Aurora Cluster","Aurora","⚡","database",{subnet_id:"a14-priv1",vpc_id:"a14-vpc",config:{engine:"aurora-postgresql",instance_class:"db.r6g.medium",deletion_protection:true}}),
    nd("a14-kms","kms_key",820,120,"DB Key","KMS Key","🔐","security"),
    nd("a14-sec","secretsmanager",820,280,"DB Credentials","Secrets Manager","🔑","security",{config:{recovery_window_in_days:7}}),
    nd("a14-cw","cloudwatch",820,440,"DB Alarms","CloudWatch","📊","monitoring"),
  ],
  edges: [
    ed("a14-e1","a14-aur","a14-kms","dependency"),ed("a14-e2","a14-aur","a14-sec","dependency"),
    ed("a14-e3","a14-aur","a14-cw","dependency"),
  ],
  graphMeta: { name:"Aurora Multi-AZ Database", provider:"aws", region:"us-east-1" },
};

const aws15 = {
  id: "tpl-security", name: "Security Posture Baseline", category: "Security",
  description: "GuardDuty + Security Hub + CloudTrail + Inspector + Macie. Comprehensive threat detection and compliance baseline.",
  nodes: [
    nd("a15-gd","guardduty",100,200,"Threat Detection","GuardDuty","🔍","security"),
    nd("a15-sh","security_hub",320,200,"Security Hub","Security Hub","🏢","security"),
    nd("a15-ct","cloudtrail",540,120,"Audit Trail","CloudTrail","📋","monitoring",{config:{include_global_events:true,multi_region:true}}),
    nd("a15-ins","inspector",540,300,"Vuln Scanner","Inspector","🔬","security"),
    nd("a15-mac","macie",760,120,"Data Scanner","Macie","🔎","security"),
    nd("a15-sns","sns",760,300,"Alert Topic","SNS","📣","integration"),
    nd("a15-kms","kms_key",980,200,"Log Key","KMS Key","🔐","security"),
  ],
  edges: [
    ed("a15-e1","a15-gd","a15-sh","dataflow"),ed("a15-e2","a15-ct","a15-sh","dataflow"),
    ed("a15-e3","a15-ins","a15-sh","dataflow"),ed("a15-e4","a15-mac","a15-sh","dataflow"),
    ed("a15-e5","a15-sh","a15-sns","dataflow"),ed("a15-e6","a15-ct","a15-kms","dependency"),
  ],
  graphMeta: { name:"Security Posture Baseline", provider:"aws", region:"us-east-1" },
};

// ═══════════════════════════════════════════════════════════════
//  AZURE TEMPLATES (15)
// ═══════════════════════════════════════════════════════════════

const az1 = {
  id: "tpl-az-web", name: "3-Tier Web App", category: "Web",
  description: "Application Gateway → App Service (multi-instance) → Azure SQL with Private Endpoint. Classic Azure web tier.",
  nodes: [
    nd("az1-agw","azure_agw",80,200,"App Gateway","Application Gateway","🔀","networking",{config:{sku:"WAF_v2"}}),
    nd("az1-waf","azure_waf",80,360,"WAF Policy","WAF","🛡️","security"),
    nd("az1-app","azure_app_service",320,200,"App Service","App Service","🌐","compute",{config:{os_type:"Linux",sku_name:"P1v3"}}),
    nd("az1-redis","azure_redis",540,120,"Redis Cache","Azure Cache","🚀","database",{config:{sku_name:"Standard",family:"C",capacity:1}}),
    nd("az1-sql","azure_sql",540,280,"Azure SQL","Azure SQL","🗄️","database",{config:{sku_name:"GP_Gen5_2",zone_redundant:true}}),
    nd("az1-kv","azure_keyvault",760,200,"Key Vault","Key Vault","🔐","security"),
    nd("az1-mon","azure_monitor",760,360,"Monitor","Azure Monitor","📊","monitoring"),
  ],
  edges: [
    ed("az1-e1","az1-agw","az1-waf","dependency"),ed("az1-e2","az1-agw","az1-app"),
    ed("az1-e3","az1-app","az1-redis","network"),ed("az1-e4","az1-app","az1-sql"),
    ed("az1-e5","az1-sql","az1-kv","dependency"),ed("az1-e6","az1-app","az1-mon","dependency"),
  ],
  graphMeta: { name:"3-Tier Web App", provider:"azure", region:"eastus" },
};

const az2 = {
  id: "tpl-az-aks", name: "AKS Microservices", category: "Containers",
  description: "Application Gateway Ingress → AKS cluster → ACR → Azure SQL + Redis. Production Kubernetes on Azure.",
  nodes: [
    nd("az2-agw","azure_agw",80,200,"Ingress Gateway","Application Gateway","🔀","networking",{config:{sku:"Standard_v2"}}),
    nd("az2-aks","azure_aks",300,200,"AKS Cluster","AKS","☸️","compute",{config:{kubernetes_version:"1.30",vm_size:"Standard_D4s_v3"}}),
    nd("az2-acr","azure_acr",520,120,"Container Registry","ACR","📦","devops",{config:{sku:"Premium"}}),
    nd("az2-sql","azure_sql",520,280,"App Database","Azure SQL","🗄️","database",{config:{sku_name:"GP_Gen5_4",zone_redundant:true}}),
    nd("az2-redis","azure_redis",740,200,"Session Cache","Redis","🚀","database"),
    nd("az2-kv","azure_keyvault",740,360,"Secrets","Key Vault","🔐","security"),
    nd("az2-mid","azure_managed_id",300,380,"Managed Identity","Managed Identity","👤","security"),
  ],
  edges: [
    ed("az2-e1","az2-agw","az2-aks"),ed("az2-e2","az2-aks","az2-acr","dependency"),
    ed("az2-e3","az2-aks","az2-sql"),ed("az2-e4","az2-aks","az2-redis","network"),
    ed("az2-e5","az2-aks","az2-kv","dependency"),ed("az2-e6","az2-mid","az2-aks","dependency"),
  ],
  graphMeta: { name:"AKS Microservices", provider:"azure", region:"eastus" },
};

const az3 = {
  id: "tpl-az-serverless", name: "Serverless API", category: "Serverless",
  description: "APIM → Azure Functions → Cosmos DB + Service Bus. Serverless API backend with managed messaging.",
  nodes: [
    nd("az3-apim","azure_apim",80,200,"API Management","APIM","🚪","networking",{config:{sku_name:"Developer"}}),
    nd("az3-fn","azure_functions",300,200,"Functions App","Azure Functions","λ","compute",{config:{os_type:"Linux",sku_name:"Y1"}}),
    nd("az3-cosmos","azure_cosmosdb",520,120,"Cosmos DB","Cosmos DB","🌍","database",{config:{offer_type:"Standard",consistency_level:"Session"}}),
    nd("az3-sb","azure_servicebus",520,300,"Service Bus","Service Bus","📬","integration",{config:{sku:"Standard"}}),
    nd("az3-kv","azure_keyvault",740,200,"Key Vault","Key Vault","🔐","security"),
    nd("az3-ai","azure_app_insights",740,360,"App Insights","App Insights","📊","monitoring"),
    nd("az3-aad","azure_aad",80,360,"Azure AD","Azure AD","👥","security"),
  ],
  edges: [
    ed("az3-e1","az3-aad","az3-apim","dependency"),ed("az3-e2","az3-apim","az3-fn","dataflow"),
    ed("az3-e3","az3-fn","az3-cosmos","dataflow"),ed("az3-e4","az3-fn","az3-sb","event"),
    ed("az3-e5","az3-fn","az3-kv","dependency"),ed("az3-e6","az3-fn","az3-ai","dependency"),
  ],
  graphMeta: { name:"Serverless API", provider:"azure", region:"eastus" },
};

const az4 = {
  id: "tpl-az-hub-spoke", name: "Hub & Spoke Network", category: "Networking",
  description: "Azure Firewall hub VNet peered to spoke VNets. Centralized security with distributed workloads.",
  nodes: [
    nd("az4-hub","azure_vnet",80,200,"Hub VNet","VNet","🌐","networking",{config:{address_space:"10.0.0.0/16"}}),
    nd("az4-fw","azure_firewall",300,200,"Azure Firewall","Azure Firewall","🔥","security"),
    nd("az4-bas","azure_bastion",300,360,"Bastion Host","Azure Bastion","🏰","security"),
    nd("az4-sp1","azure_vnet",540,120,"Spoke VNet 1","VNet","🌐","networking",{config:{address_space:"10.1.0.0/16"}}),
    nd("az4-sp2","azure_vnet",540,300,"Spoke VNet 2","VNet","🌐","networking",{config:{address_space:"10.2.0.0/16"}}),
    nd("az4-vpn","azure_vpn_gateway",80,360,"VPN Gateway","VPN Gateway","🔒","networking"),
    nd("az4-er","azure_expressroute",80,480,"ExpressRoute","ExpressRoute","⚡","networking"),
  ],
  edges: [
    ed("az4-e1","az4-hub","az4-fw","dependency"),ed("az4-e2","az4-hub","az4-bas","dependency"),
    ed("az4-e3","az4-hub","az4-sp1","network"),ed("az4-e4","az4-hub","az4-sp2","network"),
    ed("az4-e5","az4-vpn","az4-hub","network"),ed("az4-e6","az4-er","az4-hub","network"),
  ],
  graphMeta: { name:"Hub & Spoke Network", provider:"azure", region:"eastus" },
};

const az5 = {
  id: "tpl-az-events", name: "Event-Driven Platform", category: "Integration",
  description: "Event Hub ingest → Stream Analytics → Cosmos DB + Blob Storage. Real-time event processing at scale.",
  nodes: [
    nd("az5-eh","azure_eventhub",80,200,"Event Hub","Event Hub","📡","integration",{config:{sku:"Standard",partition_count:4}}),
    nd("az5-sa","azure_stream_analytics",300,200,"Stream Analytics","Stream Analytics","🌊","analytics",{config:{streaming_units:6}}),
    nd("az5-cosmos","azure_cosmosdb",540,120,"Hot Store","Cosmos DB","🌍","database"),
    nd("az5-blob","azure_blob",540,300,"Cold Store","Blob Storage","🪣","storage",{config:{account_tier:"Standard",replication_type:"LRS"}}),
    nd("az5-fn","azure_functions",760,200,"Enrichment","Azure Functions","λ","compute"),
    nd("az5-sb","azure_servicebus",760,360,"Notifications","Service Bus","📬","integration"),
  ],
  edges: [
    ed("az5-e1","az5-eh","az5-sa","streaming"),ed("az5-e2","az5-sa","az5-cosmos","dataflow"),
    ed("az5-e3","az5-sa","az5-blob","dataflow"),ed("az5-e4","az5-cosmos","az5-fn","event"),
    ed("az5-e5","az5-fn","az5-sb","dataflow"),
  ],
  graphMeta: { name:"Event-Driven Platform", provider:"azure", region:"eastus" },
};

const az6 = {
  id: "tpl-az-data", name: "Data Platform", category: "Data",
  description: "Data Factory orchestration → Synapse Analytics → ADLS Gen2. Enterprise analytics pipeline on Azure.",
  nodes: [
    nd("az6-adf","azure_datafactory",80,200,"Data Factory","Data Factory","🏭","analytics",{config:{public_network_enabled:false}}),
    nd("az6-adls","azure_datalake",300,120,"ADLS Gen2","Data Lake","🏞️","storage"),
    nd("az6-syn","azure_synapse",300,300,"Synapse","Synapse Analytics","⚡","analytics"),
    nd("az6-db","azure_databricks",540,200,"Databricks","Databricks","🔥","analytics"),
    nd("az6-kv","azure_keyvault",760,120,"Key Vault","Key Vault","🔐","security"),
    nd("az6-pur","azure_purview",760,300,"Purview","Microsoft Purview","🔍","security"),
  ],
  edges: [
    ed("az6-e1","az6-adf","az6-adls","dataflow"),ed("az6-e2","az6-adf","az6-syn","dataflow"),
    ed("az6-e3","az6-adls","az6-db","dataflow"),ed("az6-e4","az6-syn","az6-db","dataflow"),
    ed("az6-e5","az6-db","az6-kv","dependency"),ed("az6-e6","az6-adls","az6-pur","dependency"),
  ],
  graphMeta: { name:"Data Platform", provider:"azure", region:"eastus" },
};

const az7 = {
  id: "tpl-az-ml", name: "Azure ML Platform", category: "AI/ML",
  description: "Azure ML workspace → compute clusters → model registry → managed endpoints. Enterprise ML lifecycle.",
  nodes: [
    nd("az7-blob","azure_blob",80,200,"Training Data","Blob Storage","🪣","storage"),
    nd("az7-ml","azure_ml",300,200,"ML Workspace","Azure ML","🧠","ai_ml",{config:{sku_name:"Basic"}}),
    nd("az7-acr","azure_acr",520,120,"Model Registry","ACR","📦","devops"),
    nd("az7-aoi","azure_openai",520,300,"OpenAI","Azure OpenAI","🤖","ai_ml"),
    nd("az7-kv","azure_keyvault",740,200,"Secrets","Key Vault","🔐","security"),
    nd("az7-ai","azure_app_insights",740,360,"Telemetry","App Insights","📊","monitoring"),
  ],
  edges: [
    ed("az7-e1","az7-blob","az7-ml","dataflow"),ed("az7-e2","az7-ml","az7-acr","dataflow"),
    ed("az7-e3","az7-ml","az7-aoi","dependency"),ed("az7-e4","az7-ml","az7-kv","dependency"),
    ed("az7-e5","az7-ml","az7-ai","dependency"),
  ],
  graphMeta: { name:"Azure ML Platform", provider:"azure", region:"eastus" },
};

const az8 = {
  id: "tpl-az-devops", name: "Azure DevOps Pipeline", category: "DevOps",
  description: "Azure DevOps → ACR → AKS rolling deploy with Key Vault secrets and App Insights monitoring.",
  nodes: [
    nd("az8-ado","azure_devops",80,200,"DevOps Pipelines","Azure DevOps","🔄","devops"),
    nd("az8-acr","azure_acr",300,200,"Container Registry","ACR","📦","devops",{config:{sku:"Standard"}}),
    nd("az8-aks","azure_aks",520,200,"AKS Cluster","AKS","☸️","compute"),
    nd("az8-kv","azure_keyvault",520,380,"Key Vault","Key Vault","🔐","security"),
    nd("az8-ai","azure_app_insights",740,200,"App Insights","App Insights","📊","monitoring"),
    nd("az8-mon","azure_monitor",740,360,"Azure Monitor","Azure Monitor","📈","monitoring"),
  ],
  edges: [
    ed("az8-e1","az8-ado","az8-acr","dataflow"),ed("az8-e2","az8-acr","az8-aks","dependency"),
    ed("az8-e3","az8-aks","az8-kv","dependency"),ed("az8-e4","az8-aks","az8-ai","dependency"),
    ed("az8-e5","az8-ai","az8-mon","dataflow"),
  ],
  graphMeta: { name:"Azure DevOps Pipeline", provider:"azure", region:"eastus" },
};

const az9 = {
  id: "tpl-az-container-apps", name: "Container Apps Platform", category: "Containers",
  description: "APIM → Container Apps environment with Dapr sidecar → Cosmos DB + Service Bus. Serverless containers.",
  nodes: [
    nd("az9-apim","azure_apim",80,200,"API Gateway","APIM","🚪","networking"),
    nd("az9-ca","azure_container_apps",300,200,"Container Apps","Container Apps","🐳","compute",{config:{min_replicas:0,max_replicas:10}}),
    nd("az9-cosmos","azure_cosmosdb",540,120,"State Store","Cosmos DB","🌍","database"),
    nd("az9-sb","azure_servicebus",540,300,"Pub/Sub","Service Bus","📬","integration"),
    nd("az9-kv","azure_keyvault",760,200,"Secrets","Key Vault","🔐","security"),
    nd("az9-ai","azure_app_insights",760,360,"Traces","App Insights","📊","monitoring"),
  ],
  edges: [
    ed("az9-e1","az9-apim","az9-ca","dataflow"),ed("az9-e2","az9-ca","az9-cosmos","dataflow"),
    ed("az9-e3","az9-ca","az9-sb","event"),ed("az9-e4","az9-ca","az9-kv","dependency"),
    ed("az9-e5","az9-ca","az9-ai","dependency"),
  ],
  graphMeta: { name:"Container Apps Platform", provider:"azure", region:"eastus" },
};

const az10 = {
  id: "tpl-az-iot", name: "IoT Analytics Platform", category: "Data",
  description: "IoT Hub → Stream Analytics → Cosmos DB hot path + Blob cold path. Real-time IoT data processing.",
  nodes: [
    nd("az10-iot","azure_eventhub",80,200,"IoT Hub","IoT Hub","📡","integration",{config:{sku:"Standard"}}),
    nd("az10-sa","azure_stream_analytics",300,200,"Stream Analytics","Stream Analytics","🌊","analytics"),
    nd("az10-cosmos","azure_cosmosdb",540,120,"Hot Path","Cosmos DB","🌍","database"),
    nd("az10-blob","azure_blob",540,300,"Cold Path","Blob Storage","🪣","storage"),
    nd("az10-fn","azure_functions",760,200,"Alert Logic","Azure Functions","λ","compute"),
    nd("az10-sb","azure_servicebus",760,360,"Alert Queue","Service Bus","📬","integration"),
  ],
  edges: [
    ed("az10-e1","az10-iot","az10-sa","streaming"),ed("az10-e2","az10-sa","az10-cosmos","dataflow"),
    ed("az10-e3","az10-sa","az10-blob","batch"),ed("az10-e4","az10-cosmos","az10-fn","event"),
    ed("az10-e5","az10-fn","az10-sb","dataflow"),
  ],
  graphMeta: { name:"IoT Analytics Platform", provider:"azure", region:"eastus" },
};

const az11 = {
  id: "tpl-az-ha-web", name: "Global HA Web App", category: "Web",
  description: "Azure Front Door + WAF → App Service (multi-region) → Redis Cache + Azure SQL with failover.",
  nodes: [
    nd("az11-fd","azure_frontdoor",80,200,"Front Door","Front Door","🌍","networking",{config:{sku_name:"Premium_AzureFrontDoor"}}),
    nd("az11-waf","azure_waf",280,80,"WAF Policy","WAF","🛡️","security"),
    nd("az11-app1","azure_app_service",280,220,"App Service (East)","App Service","🌐","compute"),
    nd("az11-app2","azure_app_service",280,360,"App Service (West)","App Service","🌐","compute"),
    nd("az11-redis","azure_redis",500,200,"Redis Cache","Azure Cache","🚀","database"),
    nd("az11-sql","azure_sql",500,360,"SQL + Failover","Azure SQL","🗄️","database",{config:{zone_redundant:true}}),
    nd("az11-kv","azure_keyvault",700,280,"Key Vault","Key Vault","🔐","security"),
  ],
  edges: [
    ed("az11-e1","az11-fd","az11-waf","dependency"),ed("az11-e2","az11-fd","az11-app1"),
    ed("az11-e3","az11-fd","az11-app2"),ed("az11-e4","az11-app1","az11-redis","network"),
    ed("az11-e5","az11-app1","az11-sql"),ed("az11-e6","az11-sql","az11-kv","dependency"),
  ],
  graphMeta: { name:"Global HA Web App", provider:"azure", region:"eastus" },
};

const az12 = {
  id: "tpl-az-openai-rag", name: "Azure OpenAI RAG", category: "AI/ML",
  description: "Azure OpenAI + Cognitive Search → Functions orchestrator → Cosmos DB. Retrieval-Augmented Generation architecture.",
  nodes: [
    nd("az12-aoi","azure_openai",80,200,"Azure OpenAI","Azure OpenAI","🤖","ai_ml",{config:{sku_name:"S0"}}),
    nd("az12-srch","azure_search",300,120,"Cognitive Search","Cognitive Search","🔍","ai_ml",{config:{sku:"standard"}}),
    nd("az12-blob","azure_blob",300,300,"Document Store","Blob Storage","🪣","storage"),
    nd("az12-fn","azure_functions",520,200,"Orchestrator","Azure Functions","λ","compute"),
    nd("az12-cosmos","azure_cosmosdb",740,200,"Chat History","Cosmos DB","🌍","database"),
    nd("az12-kv","azure_keyvault",740,360,"API Keys","Key Vault","🔐","security"),
  ],
  edges: [
    ed("az12-e1","az12-blob","az12-srch","dataflow"),ed("az12-e2","az12-fn","az12-aoi","dataflow"),
    ed("az12-e3","az12-fn","az12-srch","dataflow"),ed("az12-e4","az12-fn","az12-cosmos","dataflow"),
    ed("az12-e5","az12-fn","az12-kv","dependency"),
  ],
  graphMeta: { name:"Azure OpenAI RAG", provider:"azure", region:"eastus" },
};

const az13 = {
  id: "tpl-az-sql-geo", name: "Geo-Redundant SQL", category: "Database",
  description: "Azure SQL with active geo-replication, Key Vault TDE, Defender for SQL, and automated backup.",
  nodes: [
    nd("az13-sql1","azure_sql",80,200,"Primary SQL (East)","Azure SQL","🗄️","database",{config:{sku_name:"GP_Gen5_4",zone_redundant:true}}),
    nd("az13-sql2","azure_sql",420,200,"Secondary SQL (West)","Azure SQL","🗄️","database",{config:{sku_name:"GP_Gen5_4"}}),
    nd("az13-kv","azure_keyvault",250,80,"TDE Key Vault","Key Vault","🔐","security"),
    nd("az13-def","azure_defender",250,340,"Defender for SQL","Microsoft Defender","🛡️","security"),
    nd("az13-bak","azure_backup",600,340,"Backup Vault","Azure Backup","💾","storage"),
    nd("az13-mon","azure_monitor",600,80,"SQL Alerts","Azure Monitor","📊","monitoring"),
  ],
  edges: [
    ed("az13-e1","az13-sql1","az13-sql2","dataflow"),ed("az13-e2","az13-sql1","az13-kv","dependency"),
    ed("az13-e3","az13-sql1","az13-def","dependency"),ed("az13-e4","az13-sql1","az13-bak","dependency"),
    ed("az13-e5","az13-sql1","az13-mon","dependency"),
  ],
  graphMeta: { name:"Geo-Redundant SQL", provider:"azure", region:"eastus" },
};

const az14 = {
  id: "tpl-az-landing-zone", name: "Secure Landing Zone", category: "Security",
  description: "Azure Policy + Defender + Sentinel + Log Analytics. Security baseline for a new Azure subscription.",
  nodes: [
    nd("az14-pol","azure_policy",80,200,"Azure Policy","Azure Policy","📋","security"),
    nd("az14-def","azure_defender",300,200,"Defender for Cloud","Microsoft Defender","🛡️","security"),
    nd("az14-sen","azure_sentinel",520,200,"Sentinel SIEM","Microsoft Sentinel","🔭","security"),
    nd("az14-la","azure_log_analytics",520,380,"Log Analytics","Log Analytics","📊","monitoring"),
    nd("az14-kv","azure_keyvault",760,200,"Key Vault","Key Vault","🔐","security"),
    nd("az14-aad","azure_aad",300,380,"Azure AD","Azure AD","👥","security"),
  ],
  edges: [
    ed("az14-e1","az14-pol","az14-def","dependency"),ed("az14-e2","az14-def","az14-sen","dataflow"),
    ed("az14-e3","az14-sen","az14-la","dataflow"),ed("az14-e4","az14-def","az14-kv","dependency"),
    ed("az14-e5","az14-aad","az14-def","dependency"),
  ],
  graphMeta: { name:"Secure Landing Zone", provider:"azure", region:"eastus" },
};

const az15 = {
  id: "tpl-az-integration", name: "Service Bus Integration", category: "Integration",
  description: "Logic Apps + Service Bus + APIM + Event Grid. Enterprise integration with managed messaging and orchestration.",
  nodes: [
    nd("az15-apim","azure_apim",80,200,"API Gateway","APIM","🚪","networking"),
    nd("az15-la","azure_logicapp",300,120,"Logic Apps","Logic Apps","🔗","integration"),
    nd("az15-sb","azure_servicebus",300,300,"Service Bus","Service Bus","📬","integration",{config:{sku:"Premium"}}),
    nd("az15-eg","azure_eventhub",520,200,"Event Grid","Event Grid","📡","integration"),
    nd("az15-fn","azure_functions",740,200,"Processor","Azure Functions","λ","compute"),
    nd("az15-ai","azure_app_insights",740,360,"Monitoring","App Insights","📊","monitoring"),
  ],
  edges: [
    ed("az15-e1","az15-apim","az15-la","dataflow"),ed("az15-e2","az15-la","az15-sb","event"),
    ed("az15-e3","az15-sb","az15-eg","event"),ed("az15-e4","az15-eg","az15-fn","event"),
    ed("az15-e5","az15-fn","az15-ai","dependency"),
  ],
  graphMeta: { name:"Service Bus Integration", provider:"azure", region:"eastus" },
};

// ═══════════════════════════════════════════════════════════════
//  GCP TEMPLATES (15)
// ═══════════════════════════════════════════════════════════════

const gcp1 = {
  id: "tpl-gcp-web", name: "3-Tier Web App", category: "Web",
  description: "Cloud Load Balancer → Compute Engine MIG → Cloud SQL (HA). Classic 3-tier web architecture on GCP.",
  nodes: [
    nd("g1-lb","gcp_lb",80,200,"Cloud Load Balancer","Cloud LB","⚡","networking",{config:{load_balancing_scheme:"EXTERNAL"}}),
    nd("g1-cdn","gcp_cdn",80,360,"Cloud CDN","Cloud CDN","🌐","networking"),
    nd("g1-mig","gcp_mig",300,200,"Instance Group","MIG","⚖️","compute",{config:{base_instance_name:"web",target_size:3}}),
    nd("g1-sql","gcp_cloudsql",520,200,"Cloud SQL","Cloud SQL","🗄️","database",{config:{database_version:"POSTGRES_15",tier:"db-custom-2-8192",availability_type:"REGIONAL"}}),
    nd("g1-mem","gcp_memorystore",520,360,"Memorystore","Memorystore","🚀","database",{config:{tier:"STANDARD_HA"}}),
    nd("g1-kms","gcp_kms",740,200,"Cloud KMS","Cloud KMS","🔐","security"),
    nd("g1-mon","gcp_monitoring",740,360,"Monitoring","Cloud Monitoring","📊","monitoring"),
  ],
  edges: [
    ed("g1-e1","g1-lb","g1-cdn","dependency"),ed("g1-e2","g1-lb","g1-mig"),
    ed("g1-e3","g1-mig","g1-sql"),ed("g1-e4","g1-mig","g1-mem","network"),
    ed("g1-e5","g1-sql","g1-kms","dependency"),ed("g1-e6","g1-mig","g1-mon","dependency"),
  ],
  graphMeta: { name:"3-Tier Web App", provider:"gcp", region:"us-central1" },
};

const gcp2 = {
  id: "tpl-gcp-gke", name: "GKE Microservices", category: "Containers",
  description: "Cloud Load Balancer → GKE Autopilot → Artifact Registry → Cloud SQL + Memorystore. Kubernetes-native platform.",
  nodes: [
    nd("g2-lb","gcp_lb",80,200,"Load Balancer","Cloud LB","⚡","networking"),
    nd("g2-gke","gcp_gke",300,200,"GKE Autopilot","GKE","☸️","compute",{config:{release_channel:"REGULAR"}}),
    nd("g2-ar","gcp_artifact_registry",520,120,"Artifact Registry","Artifact Registry","📦","devops"),
    nd("g2-sql","gcp_cloudsql",520,280,"Cloud SQL","Cloud SQL","🗄️","database",{config:{database_version:"POSTGRES_15",availability_type:"REGIONAL"}}),
    nd("g2-mem","gcp_memorystore",740,200,"Memorystore","Memorystore","🚀","database"),
    nd("g2-sec","gcp_secret_manager",740,360,"Secret Manager","Secret Manager","🔑","security"),
    nd("g2-wid","gcp_iam",300,380,"Workload Identity","Cloud IAM","👤","security"),
  ],
  edges: [
    ed("g2-e1","g2-lb","g2-gke"),ed("g2-e2","g2-gke","g2-ar","dependency"),
    ed("g2-e3","g2-gke","g2-sql"),ed("g2-e4","g2-gke","g2-mem","network"),
    ed("g2-e5","g2-gke","g2-sec","dependency"),ed("g2-e6","g2-wid","g2-gke","dependency"),
  ],
  graphMeta: { name:"GKE Microservices", provider:"gcp", region:"us-central1" },
};

const gcp3 = {
  id: "tpl-gcp-run", name: "Cloud Run Serverless API", category: "Serverless",
  description: "API Gateway → Cloud Run → Firestore + Pub/Sub. Fully managed serverless backend.",
  nodes: [
    nd("g3-apig","gcp_apigee",80,200,"API Gateway","Cloud Endpoints","🚪","networking"),
    nd("g3-run","gcp_cloud_run",300,200,"Cloud Run","Cloud Run","🐳","compute",{config:{min_instance_count:0,max_instance_count:100}}),
    nd("g3-fs","gcp_firestore",520,120,"Firestore","Firestore","🔥","database",{config:{location_id:"nam5"}}),
    nd("g3-ps","gcp_pubsub",520,300,"Pub/Sub","Pub/Sub","📡","integration"),
    nd("g3-sec","gcp_secret_manager",740,200,"Secret Manager","Secret Manager","🔑","security"),
    nd("g3-trace","gcp_trace",740,360,"Cloud Trace","Cloud Trace","🔍","monitoring"),
    nd("g3-iam","gcp_iam",80,360,"IAM","Cloud IAM","👤","security"),
  ],
  edges: [
    ed("g3-e1","g3-iam","g3-run","dependency"),ed("g3-e2","g3-apig","g3-run","dataflow"),
    ed("g3-e3","g3-run","g3-fs","dataflow"),ed("g3-e4","g3-run","g3-ps","event"),
    ed("g3-e5","g3-run","g3-sec","dependency"),ed("g3-e6","g3-run","g3-trace","dependency"),
  ],
  graphMeta: { name:"Cloud Run Serverless API", provider:"gcp", region:"us-central1" },
};

const gcp4 = {
  id: "tpl-gcp-vpc", name: "VPC Foundation", category: "Networking",
  description: "Custom VPC with regional subnets, Cloud NAT, VPC firewall rules, and Private Google Access.",
  nodes: [
    nd("g4-vpc","gcp_vpc",80,200,"Custom VPC","Cloud VPC","🌐","networking",{config:{auto_create_subnetworks:false}}),
    nd("g4-sub1","gcp_subnet",300,120,"Subnet (us-central1)","Cloud Subnet","🔲","networking",{config:{ip_cidr_range:"10.0.1.0/24",region:"us-central1",private_ip_google_access:true}}),
    nd("g4-sub2","gcp_subnet",300,300,"Subnet (us-east1)","Cloud Subnet","🔲","networking",{config:{ip_cidr_range:"10.0.2.0/24",region:"us-east1",private_ip_google_access:true}}),
    nd("g4-nat","gcp_nat",520,200,"Cloud NAT","Cloud NAT","🔀","networking"),
    nd("g4-fw","gcp_firewall",520,360,"Firewall Rules","Cloud Firewall","🔥","security"),
    nd("g4-vpn","gcp_vpn",740,200,"Cloud VPN","Cloud VPN","🔒","networking"),
  ],
  edges: [
    ed("g4-e1","g4-vpc","g4-sub1","dependency"),ed("g4-e2","g4-vpc","g4-sub2","dependency"),
    ed("g4-e3","g4-vpc","g4-nat","dependency"),ed("g4-e4","g4-vpc","g4-fw","dependency"),
    ed("g4-e5","g4-vpn","g4-vpc","network"),
  ],
  graphMeta: { name:"VPC Foundation", provider:"gcp", region:"us-central1" },
};

const gcp5 = {
  id: "tpl-gcp-bigquery", name: "BigQuery Analytics", category: "Data",
  description: "Pub/Sub → Dataflow → BigQuery → Looker dashboards. Streaming analytics pipeline with serverless SQL.",
  nodes: [
    nd("g5-ps","gcp_pubsub",80,200,"Ingest Topic","Pub/Sub","📡","integration"),
    nd("g5-df","gcp_dataflow",300,200,"Dataflow","Dataflow","🌊","analytics",{config:{autoscaling_algorithm:"THROUGHPUT_BASED"}}),
    nd("g5-bq","gcp_bigquery",520,200,"BigQuery","BigQuery","📊","analytics",{config:{location:"US"}}),
    nd("g5-look","gcp_looker",740,200,"Looker","Looker","📈","analytics"),
    nd("g5-gcs","gcp_gcs",520,380,"Staging Bucket","Cloud Storage","🪣","storage"),
    nd("g5-dc","gcp_data_catalog",740,380,"Data Catalog","Data Catalog","📁","analytics"),
  ],
  edges: [
    ed("g5-e1","g5-ps","g5-df","streaming"),ed("g5-e2","g5-df","g5-bq","dataflow"),
    ed("g5-e3","g5-bq","g5-look","dataflow"),ed("g5-e4","g5-df","g5-gcs","dataflow"),
    ed("g5-e5","g5-bq","g5-dc","dependency"),
  ],
  graphMeta: { name:"BigQuery Analytics", provider:"gcp", region:"us-central1" },
};

const gcp6 = {
  id: "tpl-gcp-pubsub", name: "Pub/Sub Event Pipeline", category: "Data",
  description: "Pub/Sub → Dataflow transforms → BigQuery + Bigtable. Multi-sink real-time streaming architecture.",
  nodes: [
    nd("g6-ps","gcp_pubsub",80,200,"Event Topic","Pub/Sub","📡","integration",{config:{message_retention_duration:"604800s"}}),
    nd("g6-df","gcp_dataflow",300,200,"Stream Transform","Dataflow","🌊","analytics"),
    nd("g6-bq","gcp_bigquery",540,120,"Analytics Store","BigQuery","📊","analytics"),
    nd("g6-bt","gcp_bigtable",540,300,"Hot Store","Bigtable","⚡","database",{config:{instance_type:"PRODUCTION"}}),
    nd("g6-run","gcp_cloud_run",760,200,"API Layer","Cloud Run","🐳","compute"),
    nd("g6-mon","gcp_monitoring",760,380,"Monitoring","Cloud Monitoring","📊","monitoring"),
  ],
  edges: [
    ed("g6-e1","g6-ps","g6-df","streaming"),ed("g6-e2","g6-df","g6-bq","dataflow"),
    ed("g6-e3","g6-df","g6-bt","dataflow"),ed("g6-e4","g6-bt","g6-run","dataflow"),
    ed("g6-e5","g6-df","g6-mon","dependency"),
  ],
  graphMeta: { name:"Pub/Sub Event Pipeline", provider:"gcp", region:"us-central1" },
};

const gcp7 = {
  id: "tpl-gcp-vertex", name: "Vertex AI ML Platform", category: "AI/ML",
  description: "Cloud Storage → Vertex AI training → Model Registry → online prediction endpoints.",
  nodes: [
    nd("g7-gcs","gcp_gcs",80,200,"Training Data","Cloud Storage","🪣","storage",{config:{location:"US"}}),
    nd("g7-df","gcp_dataflow",300,200,"Feature Engineering","Dataflow","🌊","analytics"),
    nd("g7-vai","gcp_vertex_ai",520,200,"Vertex AI","Vertex AI","🧠","ai_ml",{config:{region:"us-central1"}}),
    nd("g7-bq","gcp_bigquery",300,380,"Feature Store","BigQuery","📊","analytics"),
    nd("g7-run","gcp_cloud_run",740,200,"Prediction API","Cloud Run","🐳","compute"),
    nd("g7-kms","gcp_kms",740,380,"CMEK","Cloud KMS","🔐","security"),
  ],
  edges: [
    ed("g7-e1","g7-gcs","g7-df","dataflow"),ed("g7-e2","g7-df","g7-vai","dataflow"),
    ed("g7-e3","g7-bq","g7-vai","dataflow"),ed("g7-e4","g7-vai","g7-run","dependency"),
    ed("g7-e5","g7-vai","g7-kms","dependency"),
  ],
  graphMeta: { name:"Vertex AI ML Platform", provider:"gcp", region:"us-central1" },
};

const gcp8 = {
  id: "tpl-gcp-cicd", name: "CI/CD Pipeline", category: "DevOps",
  description: "Cloud Source Repo → Cloud Build → Artifact Registry → GKE deploy. Fully managed GCP-native CI/CD.",
  nodes: [
    nd("g8-src","gcp_source_repo",80,200,"Source Repo","Cloud Source","📁","devops"),
    nd("g8-cb","gcp_cloud_build",300,200,"Cloud Build","Cloud Build","🔨","devops"),
    nd("g8-ar","gcp_artifact_registry",520,120,"Artifact Registry","Artifact Registry","📦","devops",{config:{format:"DOCKER"}}),
    nd("g8-gke","gcp_gke",520,300,"GKE Cluster","GKE","☸️","compute"),
    nd("g8-cd","gcp_cloud_deploy",740,200,"Cloud Deploy","Cloud Deploy","🚀","devops"),
    nd("g8-log","gcp_logging",740,380,"Cloud Logging","Cloud Logging","📋","monitoring"),
  ],
  edges: [
    ed("g8-e1","g8-src","g8-cb","dependency"),ed("g8-e2","g8-cb","g8-ar","dataflow"),
    ed("g8-e3","g8-ar","g8-cd","dependency"),ed("g8-e4","g8-cd","g8-gke","dependency"),
    ed("g8-e5","g8-cb","g8-log","dependency"),
  ],
  graphMeta: { name:"CI/CD Pipeline", provider:"gcp", region:"us-central1" },
};

const gcp9 = {
  id: "tpl-gcp-datalake", name: "Data Lake & Analytics", category: "Data",
  description: "GCS raw zone → Dataproc Spark → GCS curated → BigQuery → Looker. Hadoop-compatible analytics lake.",
  nodes: [
    nd("g9-raw","gcp_gcs",80,200,"Raw Zone","Cloud Storage","🪣","storage"),
    nd("g9-dp","gcp_dataproc",300,200,"Dataproc","Dataproc","⚙️","analytics",{config:{release_channel:"REGULAR"}}),
    nd("g9-cur","gcp_gcs",520,200,"Curated Zone","Cloud Storage","🪣","storage"),
    nd("g9-bq","gcp_bigquery",740,200,"BigQuery","BigQuery","📊","analytics"),
    nd("g9-look","gcp_looker",960,200,"Looker","Looker","📈","analytics"),
    nd("g9-dc","gcp_data_catalog",740,380,"Data Catalog","Data Catalog","📁","analytics"),
  ],
  edges: [
    ed("g9-e1","g9-raw","g9-dp","dataflow"),ed("g9-e2","g9-dp","g9-cur","dataflow"),
    ed("g9-e3","g9-cur","g9-bq","dataflow"),ed("g9-e4","g9-bq","g9-look","dataflow"),
    ed("g9-e5","g9-bq","g9-dc","dependency"),
  ],
  graphMeta: { name:"Data Lake & Analytics", provider:"gcp", region:"us-central1" },
};

const gcp10 = {
  id: "tpl-gcp-spanner", name: "Spanner Global Database", category: "Database",
  description: "Cloud Spanner multi-region instance with IAM, KMS CMEK, and Cloud Monitoring. Globally consistent SQL.",
  nodes: [
    nd("g10-sp","gcp_spanner",80,200,"Spanner Instance","Cloud Spanner","🌍","database",{config:{config:"nam-eur-asia1",processing_units:1000}}),
    nd("g10-run","gcp_cloud_run",320,120,"App API","Cloud Run","🐳","compute"),
    nd("g10-gke","gcp_gke",320,280,"GKE Workers","GKE","☸️","compute"),
    nd("g10-kms","gcp_kms",560,200,"CMEK Key","Cloud KMS","🔐","security"),
    nd("g10-iam","gcp_iam",560,360,"IAM Bindings","Cloud IAM","👤","security"),
    nd("g10-mon","gcp_monitoring",760,200,"Monitoring","Cloud Monitoring","📊","monitoring"),
  ],
  edges: [
    ed("g10-e1","g10-run","g10-sp","dataflow"),ed("g10-e2","g10-gke","g10-sp","dataflow"),
    ed("g10-e3","g10-sp","g10-kms","dependency"),ed("g10-e4","g10-sp","g10-iam","dependency"),
    ed("g10-e5","g10-sp","g10-mon","dependency"),
  ],
  graphMeta: { name:"Spanner Global Database", provider:"gcp", region:"us-central1" },
};

const gcp11 = {
  id: "tpl-gcp-hybrid", name: "Hybrid Connectivity", category: "Networking",
  description: "Cloud VPN + Dedicated Interconnect to on-prem, with Private Google Access and VPC peering.",
  nodes: [
    nd("g11-vpc","gcp_vpc",80,200,"Production VPC","Cloud VPC","🌐","networking"),
    nd("g11-vpn","gcp_vpn",300,120,"Cloud VPN","Cloud VPN","🔒","networking",{config:{stack_type:"IPV4_ONLY"}}),
    nd("g11-ic","gcp_interconnect",300,300,"Interconnect","Dedicated Interconnect","⚡","networking"),
    nd("g11-nat","gcp_nat",520,200,"Cloud NAT","Cloud NAT","🔀","networking"),
    nd("g11-psc","gcp_private_sc",740,200,"Private SC","Private Service Connect","🔐","security"),
    nd("g11-fw","gcp_firewall",740,380,"Firewall","Cloud Firewall","🔥","security"),
  ],
  edges: [
    ed("g11-e1","g11-vpn","g11-vpc","network"),ed("g11-e2","g11-ic","g11-vpc","network"),
    ed("g11-e3","g11-vpc","g11-nat","dependency"),ed("g11-e4","g11-vpc","g11-psc","dependency"),
    ed("g11-e5","g11-vpc","g11-fw","dependency"),
  ],
  graphMeta: { name:"Hybrid Connectivity", provider:"gcp", region:"us-central1" },
};

const gcp12 = {
  id: "tpl-gcp-security", name: "Security Foundation", category: "Security",
  description: "Security Command Center + Cloud KMS + IAM + Cloud Armor. Security baseline for a GCP project.",
  nodes: [
    nd("g12-scc","gcp_scc",80,200,"Security Command Center","Security Command Center","🔭","security"),
    nd("g12-kms","gcp_kms",300,120,"Cloud KMS","Cloud KMS","🔐","security",{config:{key_ring:"primary-ring"}}),
    nd("g12-iam","gcp_iam",300,300,"IAM Policies","Cloud IAM","👤","security"),
    nd("g12-armor","gcp_armor",520,200,"Cloud Armor","Cloud Armor","🛡️","security"),
    nd("g12-sec","gcp_secret_manager",740,200,"Secret Manager","Secret Manager","🔑","security"),
    nd("g12-log","gcp_logging",740,360,"Audit Logs","Cloud Logging","📋","monitoring"),
  ],
  edges: [
    ed("g12-e1","g12-scc","g12-kms","dependency"),ed("g12-e2","g12-scc","g12-iam","dependency"),
    ed("g12-e3","g12-armor","g12-scc","dataflow"),ed("g12-e4","g12-kms","g12-sec","dependency"),
    ed("g12-e5","g12-iam","g12-log","dataflow"),
  ],
  graphMeta: { name:"Security Foundation", provider:"gcp", region:"us-central1" },
};

const gcp13 = {
  id: "tpl-gcp-composer", name: "Data Orchestration", category: "Data",
  description: "Cloud Composer (Airflow) → Dataflow + Dataproc jobs → BigQuery. Managed workflow orchestration.",
  nodes: [
    nd("g13-comp","gcp_cloud_composer",80,200,"Cloud Composer","Cloud Composer","🎼","analytics",{config:{environment_size:"ENVIRONMENT_SIZE_SMALL"}}),
    nd("g13-df","gcp_dataflow",300,120,"Dataflow Jobs","Dataflow","🌊","analytics"),
    nd("g13-dp","gcp_dataproc",300,300,"Dataproc Jobs","Dataproc","⚙️","analytics"),
    nd("g13-gcs","gcp_gcs",540,200,"Staging GCS","Cloud Storage","🪣","storage"),
    nd("g13-bq","gcp_bigquery",760,200,"BigQuery","BigQuery","📊","analytics"),
    nd("g13-log","gcp_logging",760,380,"Workflow Logs","Cloud Logging","📋","monitoring"),
  ],
  edges: [
    ed("g13-e1","g13-comp","g13-df","dependency"),ed("g13-e2","g13-comp","g13-dp","dependency"),
    ed("g13-e3","g13-df","g13-gcs","dataflow"),ed("g13-e4","g13-dp","g13-gcs","dataflow"),
    ed("g13-e5","g13-gcs","g13-bq","dataflow"),ed("g13-e6","g13-comp","g13-log","dependency"),
  ],
  graphMeta: { name:"Data Orchestration", provider:"gcp", region:"us-central1" },
};

const gcp14 = {
  id: "tpl-gcp-monitoring", name: "Observability Stack", category: "Monitoring",
  description: "Cloud Monitoring + Logging + Trace + Error Reporting + alerting to Pub/Sub. Full GCP observability baseline.",
  nodes: [
    nd("g14-mon","gcp_monitoring",80,200,"Cloud Monitoring","Cloud Monitoring","📊","monitoring"),
    nd("g14-log","gcp_logging",300,120,"Cloud Logging","Cloud Logging","📋","monitoring"),
    nd("g14-trace","gcp_trace",300,300,"Cloud Trace","Cloud Trace","🔍","monitoring"),
    nd("g14-err","gcp_error_reporting",540,200,"Error Reporting","Error Reporting","🚨","monitoring"),
    nd("g14-ps","gcp_pubsub",760,200,"Alert Pub/Sub","Pub/Sub","📡","integration"),
    nd("g14-run","gcp_cloud_run",960,200,"Alert Handler","Cloud Run","🐳","compute"),
  ],
  edges: [
    ed("g14-e1","g14-log","g14-mon","dataflow"),ed("g14-e2","g14-trace","g14-mon","dataflow"),
    ed("g14-e3","g14-err","g14-mon","dataflow"),ed("g14-e4","g14-mon","g14-ps","event"),
    ed("g14-e5","g14-ps","g14-run","event"),
  ],
  graphMeta: { name:"Observability Stack", provider:"gcp", region:"us-central1" },
};

const gcp15 = {
  id: "tpl-gcp-alloydb", name: "AlloyDB + Cloud Run", category: "Database",
  description: "AlloyDB primary + read replicas → Cloud Run backends → Secret Manager credentials. PostgreSQL-compatible HA database.",
  nodes: [
    nd("g15-alb","gcp_alloydb",80,200,"AlloyDB Cluster","AlloyDB","⚡","database",{config:{database_version:"POSTGRES_15",initial_user:"admin"}}),
    nd("g15-run1","gcp_cloud_run",340,120,"API Service","Cloud Run","🐳","compute"),
    nd("g15-run2","gcp_cloud_run",340,300,"Worker Service","Cloud Run","🐳","compute"),
    nd("g15-sec","gcp_secret_manager",560,200,"DB Secrets","Secret Manager","🔑","security"),
    nd("g15-vpc","gcp_vpc",80,400,"Private VPC","Cloud VPC","🌐","networking"),
    nd("g15-mon","gcp_monitoring",760,200,"DB Metrics","Cloud Monitoring","📊","monitoring"),
  ],
  edges: [
    ed("g15-e1","g15-run1","g15-alb","dataflow"),ed("g15-e2","g15-run2","g15-alb","dataflow"),
    ed("g15-e3","g15-run1","g15-sec","dependency"),ed("g15-e4","g15-run2","g15-sec","dependency"),
    ed("g15-e5","g15-alb","g15-mon","dependency"),ed("g15-e6","g15-vpc","g15-alb","dependency"),
  ],
  graphMeta: { name:"AlloyDB + Cloud Run", provider:"gcp", region:"us-central1" },
};

// ═══════════════════════════════════════════════════════════════
//  ON-PREM TEMPLATES (15)
// ═══════════════════════════════════════════════════════════════

const op1 = {
  id: "tpl-op-web", name: "3-Tier Web App", category: "Web",
  description: "Load Balancer → VM web tier → PostgreSQL primary/replica. Classic 3-tier architecture on bare metal or VMware.",
  nodes: [
    nd("op1-fw","onprem_firewall",80,200,"Perimeter Firewall","Firewall","🔥","security",{config:{vendor:"FortiGate"}}),
    nd("op1-lb","onprem_load_balancer",300,200,"Load Balancer","Load Balancer","⚖️","networking"),
    nd("op1-vm1","onprem_vm",520,120,"Web Server 1","VM","🖥️","compute",{config:{vcpus:4,memory_gb:8}}),
    nd("op1-vm2","onprem_vm",520,300,"Web Server 2","VM","🖥️","compute",{config:{vcpus:4,memory_gb:8}}),
    nd("op1-pg","onprem_postgres",760,200,"PostgreSQL Primary","PostgreSQL","🐘","database",{config:{version:"15",ha_mode:"streaming_replication"}}),
    nd("op1-pgr","onprem_postgres",960,200,"PostgreSQL Replica","PostgreSQL","🐘","database",{config:{version:"15"}}),
  ],
  edges: [
    ed("op1-e1","op1-fw","op1-lb"),ed("op1-e2","op1-lb","op1-vm1"),
    ed("op1-e3","op1-lb","op1-vm2"),ed("op1-e4","op1-vm1","op1-pg"),
    ed("op1-e5","op1-vm2","op1-pg"),ed("op1-e6","op1-pg","op1-pgr","dataflow"),
  ],
  graphMeta: { name:"3-Tier Web App", provider:"onprem", region:"on-premises" },
};

const op2 = {
  id: "tpl-op-k8s", name: "Kubernetes Cluster", category: "Containers",
  description: "HAProxy ingress → Kubernetes control plane + worker nodes → Ceph storage + PostgreSQL. Self-managed K8s.",
  nodes: [
    nd("op2-lb","onprem_load_balancer",80,200,"Ingress LB","HAProxy","⚖️","networking"),
    nd("op2-k8s","onprem_k8s",300,200,"K8s Cluster","Kubernetes","☸️","compute",{config:{version:"1.30",control_plane_nodes:3}}),
    nd("op2-san","onprem_san",540,120,"SAN Storage","SAN","💾","storage",{config:{vendor:"NetApp"}}),
    nd("op2-pg","onprem_postgres",540,300,"PostgreSQL","PostgreSQL","🐘","database"),
    nd("op2-reg","onprem_artifact_repo",760,200,"OCI Registry","Harbor","📦","devops"),
    nd("op2-mon","onprem_monitoring",760,380,"Prometheus","Prometheus","📊","monitoring"),
    nd("op2-mesh","onprem_service_mesh",300,380,"Service Mesh","Istio","🕸️","networking"),
  ],
  edges: [
    ed("op2-e1","op2-lb","op2-k8s"),ed("op2-e2","op2-k8s","op2-san","dependency"),
    ed("op2-e3","op2-k8s","op2-pg"),ed("op2-e4","op2-k8s","op2-reg","dependency"),
    ed("op2-e5","op2-mesh","op2-k8s","dependency"),ed("op2-e6","op2-k8s","op2-mon","dependency"),
  ],
  graphMeta: { name:"Kubernetes Cluster", provider:"onprem", region:"on-premises" },
};

const op3 = {
  id: "tpl-op-network", name: "Network Foundation", category: "Networking",
  description: "Core firewall → distribution switches → VLANs with DNS, DHCP, and VPN concentrator.",
  nodes: [
    nd("op3-fw","onprem_firewall",80,200,"Core Firewall","Firewall","🔥","security",{config:{ha_mode:"active-passive"}}),
    nd("op3-rt","onprem_router",300,200,"Core Router","Router","🌐","networking"),
    nd("op3-sw","onprem_switch",520,200,"Distribution Switch","Switch","🔌","networking"),
    nd("op3-vlan1","onprem_vlan",740,120,"Prod VLAN","VLAN","🔲","networking",{config:{vlan_id:10,cidr:"10.10.0.0/24"}}),
    nd("op3-vlan2","onprem_vlan",740,300,"Mgmt VLAN","VLAN","🔲","networking",{config:{vlan_id:20,cidr:"10.20.0.0/24"}}),
    nd("op3-dns","onprem_dns",960,120,"DNS/DHCP","Internal DNS","🌐","networking"),
    nd("op3-vpn","onprem_vpn",960,300,"VPN Concentrator","VPN","🔒","security"),
  ],
  edges: [
    ed("op3-e1","op3-fw","op3-rt"),ed("op3-e2","op3-rt","op3-sw"),
    ed("op3-e3","op3-sw","op3-vlan1","network"),ed("op3-e4","op3-sw","op3-vlan2","network"),
    ed("op3-e5","op3-vlan1","op3-dns","dependency"),ed("op3-e6","op3-vpn","op3-fw","network"),
  ],
  graphMeta: { name:"Network Foundation", provider:"onprem", region:"on-premises" },
};

const op4 = {
  id: "tpl-op-ha-db", name: "HA Database Cluster", category: "Database",
  description: "Primary + replica PostgreSQL with Patroni HA, PgBouncer connection pooling, and automated backup.",
  nodes: [
    nd("op4-lb","onprem_load_balancer",80,200,"PgBouncer","PgBouncer","⚖️","networking"),
    nd("op4-pg1","onprem_postgres",300,120,"Primary DB","PostgreSQL","🐘","database",{config:{version:"15",ha_mode:"patroni"}}),
    nd("op4-pg2","onprem_postgres",300,300,"Replica 1","PostgreSQL","🐘","database",{config:{version:"15"}}),
    nd("op4-pg3","onprem_postgres",520,300,"Replica 2","PostgreSQL","🐘","database",{config:{version:"15"}}),
    nd("op4-bak","onprem_backup_server",540,120,"Backup Server","Backup","💾","storage",{config:{retention_days:30}}),
    nd("op4-mon","onprem_monitoring",740,200,"DB Monitor","Monitoring","📊","monitoring"),
  ],
  edges: [
    ed("op4-e1","op4-lb","op4-pg1"),ed("op4-e2","op4-pg1","op4-pg2","dataflow"),
    ed("op4-e3","op4-pg1","op4-pg3","dataflow"),ed("op4-e4","op4-pg1","op4-bak","batch"),
    ed("op4-e5","op4-pg1","op4-mon","dependency"),
  ],
  graphMeta: { name:"HA Database Cluster", provider:"onprem", region:"on-premises" },
};

const op5 = {
  id: "tpl-op-cicd", name: "CI/CD Pipeline", category: "DevOps",
  description: "Gitea → Jenkins → Harbor registry → Kubernetes deploy. Self-hosted CI/CD with container registry.",
  nodes: [
    nd("op5-git","onprem_git_server",80,200,"Gitea","Gitea","📁","devops"),
    nd("op5-ci","onprem_ci_cd",300,200,"Jenkins","Jenkins","🔨","devops"),
    nd("op5-art","onprem_artifact_repo",520,120,"Harbor Registry","Harbor","📦","devops"),
    nd("op5-k8s","onprem_k8s",520,300,"K8s Target","Kubernetes","☸️","compute"),
    nd("op5-cfg","onprem_config_mgmt",740,200,"Config Mgmt","Ansible","⚙️","devops"),
    nd("op5-mon","onprem_monitoring",740,380,"Build Metrics","Prometheus","📊","monitoring"),
  ],
  edges: [
    ed("op5-e1","op5-git","op5-ci","dependency"),ed("op5-e2","op5-ci","op5-art","dataflow"),
    ed("op5-e3","op5-art","op5-k8s","dependency"),ed("op5-e4","op5-ci","op5-cfg","dependency"),
    ed("op5-e5","op5-ci","op5-mon","dependency"),
  ],
  graphMeta: { name:"CI/CD Pipeline", provider:"onprem", region:"on-premises" },
};

const op6 = {
  id: "tpl-op-soc", name: "Security Operations Center", category: "Security",
  description: "SIEM + IDS/IPS + PAM + CA. On-premises security operations baseline with full audit trail.",
  nodes: [
    nd("op6-siem","onprem_siem",80,200,"SIEM","Splunk / ELK","🔭","security"),
    nd("op6-ids","onprem_ids_ips",300,120,"IDS/IPS","Snort/Suricata","🔍","security"),
    nd("op6-pam","onprem_pam",300,300,"PAM","CyberArk / Vault","🔐","security"),
    nd("op6-ca","onprem_ca",520,200,"Certificate Authority","Internal CA","🔒","security"),
    nd("op6-vault","onprem_vault",740,200,"Secrets Vault","HashiCorp Vault","🏦","security"),
    nd("op6-log","onprem_log_aggregator",740,360,"Log Aggregator","Fluentd","📋","monitoring"),
  ],
  edges: [
    ed("op6-e1","op6-ids","op6-siem","dataflow"),ed("op6-e2","op6-pam","op6-siem","dataflow"),
    ed("op6-e3","op6-ca","op6-pam","dependency"),ed("op6-e4","op6-vault","op6-pam","dependency"),
    ed("op6-e5","op6-log","op6-siem","dataflow"),
  ],
  graphMeta: { name:"Security Operations Center", provider:"onprem", region:"on-premises" },
};

const op7 = {
  id: "tpl-op-service-mesh", name: "Service Mesh Platform", category: "Containers",
  description: "Istio control plane → sidecar-injected microservices → Kiali observability. Zero-trust service-to-service communication.",
  nodes: [
    nd("op7-ing","onprem_load_balancer",80,200,"Ingress Gateway","Istio Ingress","🔀","networking"),
    nd("op7-mesh","onprem_service_mesh",300,200,"Istio Control","Istio","🕸️","networking"),
    nd("op7-svc1","onprem_k8s",540,120,"Service A","Pod","🐳","compute"),
    nd("op7-svc2","onprem_k8s",540,300,"Service B","Pod","🐳","compute"),
    nd("op7-svc3","onprem_container",760,200,"Service C","Pod","🐳","compute"),
    nd("op7-mon","onprem_monitoring",960,200,"Kiali / Jaeger","Kiali","📊","monitoring"),
    nd("op7-vault","onprem_vault",300,380,"mTLS Certs","Vault","🔐","security"),
  ],
  edges: [
    ed("op7-e1","op7-ing","op7-mesh"),ed("op7-e2","op7-mesh","op7-svc1"),
    ed("op7-e3","op7-mesh","op7-svc2"),ed("op7-e4","op7-svc1","op7-svc3"),
    ed("op7-e5","op7-svc2","op7-svc3"),ed("op7-e6","op7-mesh","op7-mon","dependency"),
    ed("op7-e7","op7-vault","op7-mesh","dependency"),
  ],
  graphMeta: { name:"Service Mesh Platform", provider:"onprem", region:"on-premises" },
};

const op8 = {
  id: "tpl-op-storage", name: "Storage Infrastructure", category: "Storage",
  description: "SAN primary + NAS shared storage + backup server + tape library. Enterprise storage stack.",
  nodes: [
    nd("op8-san","onprem_san",80,200,"SAN Array","SAN","💾","storage",{config:{vendor:"NetApp",protocol:"NVMe-oF"}}),
    nd("op8-nas","onprem_nas",320,200,"NAS Filer","NAS","📁","storage",{config:{vendor:"Dell EMC",protocol:"NFS/SMB"}}),
    nd("op8-obj","onprem_object_store",560,120,"Object Store","MinIO","🪣","storage"),
    nd("op8-bak","onprem_backup_server",560,300,"Backup Server","Veeam","💽","storage",{config:{retention_days:90}}),
    nd("op8-tape","onprem_tape_library",780,200,"Tape Library","Tape","📼","storage",{config:{retention_years:7}}),
    nd("op8-mon","onprem_monitoring",780,380,"Storage Monitor","Monitoring","📊","monitoring"),
  ],
  edges: [
    ed("op8-e1","op8-san","op8-bak","dependency"),ed("op8-e2","op8-nas","op8-bak","dependency"),
    ed("op8-e3","op8-obj","op8-bak","dependency"),ed("op8-e4","op8-bak","op8-tape","batch"),
    ed("op8-e5","op8-san","op8-mon","dependency"),
  ],
  graphMeta: { name:"Storage Infrastructure", provider:"onprem", region:"on-premises" },
};

const op9 = {
  id: "tpl-op-messaging", name: "Message-Driven Microservices", category: "Integration",
  description: "RabbitMQ broker → multiple consumer services → PostgreSQL + MongoDB. Async microservice communication.",
  nodes: [
    nd("op9-mq","onprem_message_broker",80,200,"Message Broker","RabbitMQ","📬","integration",{config:{ha_mode:"mirrored"}}),
    nd("op9-svc1","onprem_container",300,120,"Order Service","Pod","🐳","compute"),
    nd("op9-svc2","onprem_container",300,300,"Inventory Svc","Pod","🐳","compute"),
    nd("op9-svc3","onprem_container",520,200,"Notification Svc","Pod","🐳","compute"),
    nd("op9-pg","onprem_postgres",740,120,"Orders DB","PostgreSQL","🐘","database"),
    nd("op9-mg","onprem_mongodb",740,300,"Catalog DB","MongoDB","🍃","database"),
    nd("op9-apigw","onprem_api_gateway",80,380,"API Gateway","Kong","🚪","networking"),
  ],
  edges: [
    ed("op9-e1","op9-apigw","op9-mq","event"),ed("op9-e2","op9-mq","op9-svc1","event"),
    ed("op9-e3","op9-mq","op9-svc2","event"),ed("op9-e4","op9-mq","op9-svc3","event"),
    ed("op9-e5","op9-svc1","op9-pg","dataflow"),ed("op9-e6","op9-svc2","op9-mg","dataflow"),
  ],
  graphMeta: { name:"Message-Driven Microservices", provider:"onprem", region:"on-premises" },
};

const op10 = {
  id: "tpl-op-zerotrust", name: "Zero Trust Architecture", category: "Security",
  description: "Identity-aware proxy + PAM + Vault + micro-segmented VLANs. Never trust, always verify.",
  nodes: [
    nd("op10-idp","onprem_idp",80,200,"Identity Provider","Okta/AD","👥","security"),
    nd("op10-proxy","onprem_proxy",300,200,"Identity-Aware Proxy","IAP","🔀","networking"),
    nd("op10-pam","onprem_pam",520,120,"Privileged Access","CyberArk","🔐","security"),
    nd("op10-vault","onprem_vault",520,300,"Secrets Vault","HashiCorp Vault","🏦","security"),
    nd("op10-fw","onprem_firewall",740,200,"Micro-seg FW","Firewall","🔥","security"),
    nd("op10-siem","onprem_siem",740,380,"SIEM","Splunk","🔭","security"),
    nd("op10-waf","onprem_waf",300,380,"WAF","ModSecurity","🛡️","security"),
  ],
  edges: [
    ed("op10-e1","op10-idp","op10-proxy","dependency"),ed("op10-e2","op10-proxy","op10-pam","dependency"),
    ed("op10-e3","op10-proxy","op10-vault","dependency"),ed("op10-e4","op10-proxy","op10-fw"),
    ed("op10-e5","op10-fw","op10-siem","dataflow"),ed("op10-e6","op10-waf","op10-proxy","dependency"),
  ],
  graphMeta: { name:"Zero Trust Architecture", provider:"onprem", region:"on-premises" },
};

const op11 = {
  id: "tpl-op-monitoring", name: "Observability Stack", category: "Monitoring",
  description: "Prometheus + Grafana + Loki + Jaeger + Alertmanager. Full open-source observability for on-prem workloads.",
  nodes: [
    nd("op11-prom","onprem_monitoring",80,200,"Prometheus","Prometheus","📊","monitoring"),
    nd("op11-graf","onprem_monitoring",300,120,"Grafana","Grafana","📈","monitoring"),
    nd("op11-loki","onprem_log_aggregator",300,300,"Loki","Loki","📋","monitoring"),
    nd("op11-jaeg","onprem_tracing",540,200,"Jaeger","Jaeger","🔍","monitoring"),
    nd("op11-alert","onprem_monitoring",760,200,"Alertmanager","Alertmanager","🚨","monitoring"),
    nd("op11-pg","onprem_postgres",760,380,"Metrics DB","PostgreSQL","🐘","database"),
  ],
  edges: [
    ed("op11-e1","op11-prom","op11-graf","dataflow"),ed("op11-e2","op11-loki","op11-graf","dataflow"),
    ed("op11-e3","op11-jaeg","op11-graf","dataflow"),ed("op11-e4","op11-prom","op11-alert","dependency"),
    ed("op11-e5","op11-prom","op11-pg","dataflow"),
  ],
  graphMeta: { name:"Observability Stack", provider:"onprem", region:"on-premises" },
};

const op12 = {
  id: "tpl-op-identity", name: "Identity & Access Platform", category: "Security",
  description: "Active Directory + LDAP + CA + PAM + Vault. Centralized identity, authentication, and authorization.",
  nodes: [
    nd("op12-ad","onprem_idp",80,200,"Active Directory","Active Directory","🏢","security",{config:{domain:"corp.local"}}),
    nd("op12-ldap","onprem_idp",300,120,"LDAP Directory","OpenLDAP","📒","security"),
    nd("op12-ca","onprem_ca",300,300,"PKI / CA","Certificate Authority","🔒","security"),
    nd("op12-pam","onprem_pam",540,200,"PAM","CyberArk","🔐","security"),
    nd("op12-vault","onprem_vault",760,200,"HashiCorp Vault","Vault","🏦","security"),
    nd("op12-siem","onprem_siem",760,380,"Auth Logging","SIEM","🔭","security"),
  ],
  edges: [
    ed("op12-e1","op12-ad","op12-ldap","dataflow"),ed("op12-e2","op12-ad","op12-pam","dependency"),
    ed("op12-e3","op12-ca","op12-pam","dependency"),ed("op12-e4","op12-pam","op12-vault","dependency"),
    ed("op12-e5","op12-pam","op12-siem","dataflow"),
  ],
  graphMeta: { name:"Identity & Access Platform", provider:"onprem", region:"on-premises" },
};

const op13 = {
  id: "tpl-op-devsecops", name: "DevSecOps Pipeline", category: "DevOps",
  description: "Git → Jenkins + SAST/DAST → Harbor with image scan → K8s with policy enforcement.",
  nodes: [
    nd("op13-git","onprem_git_server",80,200,"Gitea","Gitea","📁","devops"),
    nd("op13-ci","onprem_ci_cd",300,200,"Jenkins","Jenkins","🔨","devops"),
    nd("op13-scan","onprem_siem",520,120,"SAST/DAST","Sonarqube/ZAP","🔍","security"),
    nd("op13-art","onprem_artifact_repo",520,300,"Secure Registry","Harbor","📦","devops"),
    nd("op13-k8s","onprem_k8s",740,200,"K8s + OPA","Kubernetes","☸️","compute",{config:{admission_controller:"OPA Gatekeeper"}}),
    nd("op13-mon","onprem_monitoring",740,380,"Metrics","Prometheus","📊","monitoring"),
  ],
  edges: [
    ed("op13-e1","op13-git","op13-ci","dependency"),ed("op13-e2","op13-ci","op13-scan","dependency"),
    ed("op13-e3","op13-ci","op13-art","dataflow"),ed("op13-e4","op13-scan","op13-art","dependency"),
    ed("op13-e5","op13-art","op13-k8s","dependency"),ed("op13-e6","op13-k8s","op13-mon","dependency"),
  ],
  graphMeta: { name:"DevSecOps Pipeline", provider:"onprem", region:"on-premises" },
};

const op14 = {
  id: "tpl-op-datawarehouse", name: "On-Prem Data Warehouse", category: "Data",
  description: "ETL pipeline → ClickHouse warehouse → Elasticsearch → Grafana analytics.",
  nodes: [
    nd("op14-etl","onprem_etl",80,200,"ETL Pipeline","Apache NiFi","🔄","analytics"),
    nd("op14-dw","onprem_postgres",320,200,"Data Warehouse","ClickHouse","🏗️","database",{config:{type:"analytical",shards:4}}),
    nd("op14-es","onprem_elasticsearch",560,120,"Elasticsearch","Elasticsearch","🔍","database"),
    nd("op14-graf","onprem_monitoring",560,300,"Grafana","Grafana","📈","monitoring"),
    nd("op14-nas","onprem_nas",780,200,"NAS Archive","NAS","📁","storage"),
    nd("op14-bak","onprem_backup_server",780,380,"Backup","Backup Server","💾","storage"),
  ],
  edges: [
    ed("op14-e1","op14-etl","op14-dw","batch"),ed("op14-e2","op14-dw","op14-es","dataflow"),
    ed("op14-e3","op14-es","op14-graf","dataflow"),ed("op14-e4","op14-dw","op14-graf","dataflow"),
    ed("op14-e5","op14-dw","op14-nas","batch"),ed("op14-e6","op14-nas","op14-bak","batch"),
  ],
  graphMeta: { name:"On-Prem Data Warehouse", provider:"onprem", region:"on-premises" },
};

const op15 = {
  id: "tpl-op-hybrid", name: "Hybrid Cloud Bridge", category: "Networking",
  description: "On-prem DC connected to cloud via VPN + dedicated link with DMZ, reverse proxy, and service mesh.",
  nodes: [
    nd("op15-fw","onprem_firewall",80,200,"Edge Firewall","Firewall","🔥","security",{config:{ha_mode:"active-active"}}),
    nd("op15-vpn","onprem_vpn",300,120,"VPN Tunnel","VPN","🔒","security"),
    nd("op15-rt","onprem_router",300,300,"Border Router","Router","🌐","networking"),
    nd("op15-proxy","onprem_proxy",540,200,"Reverse Proxy","NGINX","🔀","networking"),
    nd("op15-k8s","onprem_k8s",760,200,"On-Prem K8s","Kubernetes","☸️","compute"),
    nd("op15-mon","onprem_monitoring",760,380,"Unified Monitor","Prometheus","📊","monitoring"),
    nd("op15-dns","onprem_dns",540,380,"Split DNS","CoreDNS","🌐","networking"),
  ],
  edges: [
    ed("op15-e1","op15-fw","op15-vpn"),ed("op15-e2","op15-fw","op15-rt"),
    ed("op15-e3","op15-rt","op15-proxy"),ed("op15-e4","op15-proxy","op15-k8s"),
    ed("op15-e5","op15-k8s","op15-mon","dependency"),ed("op15-e6","op15-dns","op15-proxy","dependency"),
  ],
  graphMeta: { name:"Hybrid Cloud Bridge", provider:"onprem", region:"on-premises" },
};

// ═══════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════

export const TEMPLATES_BY_PROVIDER = {
  aws:    [aws1,aws2,aws3,aws4,aws5,aws6,aws7,aws8,aws9,aws10,aws11,aws12,aws13,aws14,aws15],
  azure:  [az1,az2,az3,az4,az5,az6,az7,az8,az9,az10,az11,az12,az13,az14,az15],
  gcp:    [gcp1,gcp2,gcp3,gcp4,gcp5,gcp6,gcp7,gcp8,gcp9,gcp10,gcp11,gcp12,gcp13,gcp14,gcp15],
  onprem: [op1,op2,op3,op4,op5,op6,op7,op8,op9,op10,op11,op12,op13,op14,op15],
};

export const TEMPLATES = Object.values(TEMPLATES_BY_PROVIDER).flat();
