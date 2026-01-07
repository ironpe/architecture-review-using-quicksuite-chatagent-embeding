import json
import os
import boto3
from datetime import datetime

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('BUCKET_NAME')

def handler(event, context):
    """
    Lambda handler for generating Mermaid architecture diagrams
    """
    print(f"Event: {json.dumps(event)}")
    
    try:
        # Extract parameters
        document_id = event.get('documentId')
        diagram_type = event.get('diagramType', 'quicksight-bi')
        description = event.get('description', 'AWS Architecture')
        
        if not document_id:
            return {
                'output': {
                    'error': 'documentId is required'
                }
            }
        
        # Generate Mermaid diagram based on type
        if diagram_type == 'quicksight-bi':
            mermaid_code = generate_quicksight_bi_mermaid(description)
        else:
            mermaid_code = generate_generic_mermaid(description)
        
        # Save to S3
        timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        s3_key = f"diagrams/{document_id}/architecture-{timestamp}.mmd"
        
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=mermaid_code.encode('utf-8'),
            ContentType='text/plain'
        )
        
        return {
            'output': {
                'message': 'Mermaid diagram generated successfully',
                'documentId': document_id,
                's3Key': s3_key,
                'bucket': BUCKET_NAME,
                'mermaidCode': mermaid_code,
                'viewUrl': f"https://mermaid.live/edit#pako:{encode_mermaid(mermaid_code)}"
            }
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'output': {
                'error': str(e)
            }
        }

def generate_quicksight_bi_mermaid(description):
    """
    Generate Mermaid diagram for QuickSight BI architecture
    """
    return f"""graph TB
    subgraph "Authentication Layer"
        Okta[Okta SSO<br/>SAML 2.0]
        IAM[IAM Federation<br/>Role-based Access]
    end
    
    subgraph "AWS Environment - PAX"
        VPC1[VPC<br/>Private Network]
        Lambda1[Lambda<br/>Data Processing]
        Athena1[Athena<br/>Query Service]
        QS1[QuickSight<br/>BI Visualization]
    end
    
    subgraph "AWS Environment - CGO"
        VPC2[VPC<br/>Private Network]
        Lambda2[Lambda<br/>Data Processing]
        Athena2[Athena<br/>Query Service]
        QS2[QuickSight<br/>BI Visualization]
    end
    
    subgraph "AWS Environment - ERP"
        VPC3[VPC<br/>Private Network]
        Lambda3[Lambda<br/>Data Processing]
        Athena3[Athena<br/>Query Service]
        QS3[QuickSight<br/>BI Visualization]
    end
    
    subgraph "Data Layer"
        Redshift[(Redshift Cluster<br/>ra3.4xlarge x2<br/>ra3.xlplus x2)]
        Glue[Glue Catalog<br/>Metadata]
        S3[(S3 Data Lake<br/>Raw Data)]
    end
    
    subgraph "Monitoring & Security"
        CloudWatch[CloudWatch<br/>Monitoring]
        CloudTrail[CloudTrail<br/>Audit Logs]
        EventBridge[EventBridge<br/>Events]
        KMS[KMS<br/>Encryption]
    end
    
    Okta --> IAM
    IAM --> QS1
    IAM --> QS2
    IAM --> QS3
    
    Lambda1 --> Athena1
    Lambda2 --> Athena2
    Lambda3 --> Athena3
    
    Athena1 --> Redshift
    Athena2 --> Redshift
    Athena3 --> Redshift
    
    Redshift --> S3
    S3 --> Glue
    
    QS1 --> CloudWatch
    QS2 --> CloudWatch
    QS3 --> CloudWatch
    
    Lambda1 --> CloudTrail
    Lambda2 --> CloudTrail
    Lambda3 --> CloudTrail
    
    CloudTrail --> EventBridge
    Redshift -.->|encrypted| KMS
    
    style Okta fill:#FF9900
    style IAM fill:#DD344C
    style QS1 fill:#8C4FFF
    style QS2 fill:#8C4FFF
    style QS3 fill:#8C4FFF
    style Redshift fill:#3F8624
    style S3 fill:#569A31
    style KMS fill:#DD344C
"""

def generate_generic_mermaid(description):
    """
    Generate generic Mermaid architecture diagram
    """
    return f"""graph TB
    Users[Users] --> CloudFront[CloudFront<br/>CDN]
    CloudFront --> ALB[Application<br/>Load Balancer]
    
    subgraph "Application Tier"
        ALB --> API[API Gateway]
        API --> Lambda[Lambda<br/>Functions]
    end
    
    subgraph "Data Tier"
        Lambda --> RDS[(RDS<br/>Database)]
        Lambda --> DynamoDB[(DynamoDB<br/>NoSQL)]
        Lambda --> S3[(S3<br/>Storage)]
    end
    
    subgraph "Security & Monitoring"
        Cognito[Cognito<br/>Auth]
        CloudWatch[CloudWatch<br/>Logs]
    end
    
    Users --> Cognito
    Lambda --> CloudWatch
    
    style CloudFront fill:#8C4FFF
    style ALB fill:#FF9900
    style Lambda fill:#FF9900
    style RDS fill:#3F8624
    style DynamoDB fill:#3F8624
    style S3 fill:#569A31
"""

def encode_mermaid(mermaid_code):
    """
    Encode Mermaid code for mermaid.live URL (simplified)
    """
    import base64
    import zlib
    compressed = zlib.compress(mermaid_code.encode('utf-8'), 9)
    return base64.urlsafe_b64encode(compressed).decode('utf-8')
