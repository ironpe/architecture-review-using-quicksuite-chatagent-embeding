import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.BUCKET_NAME!;

export async function handler(event: any): Promise<any> {
  console.log('Diagram generator invoked:', JSON.stringify(event, null, 2));

  try {
    const { documentId, diagramType = 'quicksight-bi', description = 'AWS Architecture' } = event;

    if (!documentId) {
      return { output: { error: 'documentId is required' } };
    }

    // Generate Mermaid diagram
    let mermaidCode: string;
    if (diagramType === 'quicksight-bi') {
      mermaidCode = generateQuickSightBIMermaid(description);
    } else {
      mermaidCode = generateGenericMermaid(description);
    }

    // Save to S3
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const s3Key = `diagrams/${documentId}/architecture-${timestamp}.mmd`;

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: mermaidCode,
      ContentType: 'text/plain; charset=utf-8',
    }));

    console.log('Diagram saved to S3:', s3Key);

    return {
      output: {
        message: 'Mermaid diagram generated successfully',
        documentId,
        s3Key,
        bucket: BUCKET_NAME,
        mermaidCode,
        editUrl: `https://mermaid.live/edit#base64:${Buffer.from(mermaidCode).toString('base64')}`,
      },
    };
  } catch (error) {
    console.error('Error:', error);
    return { output: { error: error instanceof Error ? error.message : 'Unknown error' } };
  }
}

function generateQuickSightBIMermaid(_description: string): string {
  return `graph TB
    subgraph auth["🔐 Authentication Layer"]
        okta[Okta SSO<br/>SAML 2.0]
        iam[IAM Federation<br/>Role-based Access]
    end
    
    subgraph pax["☁️ AWS Environment - PAX"]
        vpc1[VPC]
        lambda1[Lambda]
        athena1[Athena]
        qs1[QuickSight]
    end
    
    subgraph cgo["☁️ AWS Environment - CGO"]
        vpc2[VPC]
        lambda2[Lambda]
        athena2[Athena]
        qs2[QuickSight]
    end
    
    subgraph erp["☁️ AWS Environment - ERP"]
        vpc3[VPC]
        lambda3[Lambda]
        athena3[Athena]
        qs3[QuickSight]
    end
    
    subgraph data["💾 Data Layer"]
        redshift[(Redshift Cluster<br/>ra3.4xlarge x2<br/>ra3.xlplus x2)]
        glue[Glue Catalog]
        s3[(S3 Data Lake<br/>10TB SPICE)]
    end
    
    subgraph monitor["📊 Monitoring & Security"]
        cloudwatch[CloudWatch]
        cloudtrail[CloudTrail]
        eventbridge[EventBridge]
        kms[KMS Encryption]
    end
    
    okta --> iam
    iam --> qs1
    iam --> qs2
    iam --> qs3
    
    lambda1 --> athena1
    lambda2 --> athena2
    lambda3 --> athena3
    
    athena1 --> redshift
    athena2 --> redshift
    athena3 --> redshift
    
    redshift --> s3
    s3 --> glue
    
    qs1 --> cloudwatch
    qs2 --> cloudwatch
    qs3 --> cloudwatch
    
    lambda1 --> cloudtrail
    lambda2 --> cloudtrail
    lambda3 --> cloudtrail
    
    cloudtrail --> eventbridge
    redshift -.->|encrypted| kms
    
    classDef authStyle fill:#FF9900,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef computeStyle fill:#FF9900,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef dataStyle fill:#3F8624,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef securityStyle fill:#DD344C,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef analyticsStyle fill:#8C4FFF,stroke:#232F3E,stroke-width:2px,color:#fff
    
    class okta,iam authStyle
    class lambda1,lambda2,lambda3,athena1,athena2,athena3 computeStyle
    class redshift,s3,glue dataStyle
    class kms,cloudtrail securityStyle
    class qs1,qs2,qs3 analyticsStyle
`;
}

function generateGenericMermaid(_description: string): string {
  return `graph TB
    users[👥 Users] --> cloudfront[CloudFront<br/>CDN]
    cloudfront --> alb[Application<br/>Load Balancer]
    
    subgraph app["Application Tier"]
        alb --> api[API Gateway]
        api --> lambda[Lambda<br/>Functions]
    end
    
    subgraph data["Data Tier"]
        lambda --> rds[(RDS<br/>Database)]
        lambda --> dynamodb[(DynamoDB<br/>NoSQL)]
        lambda --> s3[(S3<br/>Storage)]
    end
    
    subgraph security["Security & Monitoring"]
        cognito[Cognito<br/>Authentication]
        cloudwatch[CloudWatch<br/>Monitoring]
    end
    
    users --> cognito
    lambda --> cloudwatch
    
    classDef cdnStyle fill:#8C4FFF,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef computeStyle fill:#FF9900,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef dataStyle fill:#3F8624,stroke:#232F3E,stroke-width:2px,color:#fff
    classDef securityStyle fill:#DD344C,stroke:#232F3E,stroke-width:2px,color:#fff
    
    class cloudfront cdnStyle
    class alb,api,lambda computeStyle
    class rds,dynamodb,s3 dataStyle
    class cognito,cloudwatch securityStyle
`;
}
