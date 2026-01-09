// QuickSight related types

export interface QuickSightEmbedRequest {
  userArn?: string;
  userName?: string;
  email?: string;
}

export interface QuickSightEmbedResponse {
  embedUrl: string;
  agentId?: string;
  status: number;
}

export interface QuickSightConfig {
  accountId: string;
  region: string;
  agentArn: string;
  namespace: string;
}
