import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface QuickSightEmbedResponse {
  embedUrl: string;
  status: number;
}

/**
 * Get QuickSight embed URL
 */
export async function getQuickSightEmbedUrl(): Promise<QuickSightEmbedResponse> {
  try {
    // Get Cognito token
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    
    const response = await axios.get<QuickSightEmbedResponse>(
      `${API_BASE_URL}/quicksight/embed-url`,
      {
        headers: token ? {
          Authorization: `Bearer ${token}`,
        } : {},
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to get QuickSight embed URL');
    }
    throw error;
  }
}
