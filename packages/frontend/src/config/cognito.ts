import { Amplify } from 'aws-amplify';

export const cognitoConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || 'YOUR_USER_POOL_ID',
      userPoolClientId: import.meta.env.VITE_USER_POOL_WEB_CLIENT_ID || 'YOUR_CLIENT_ID',
    },
  },
};

// Initialize Amplify
Amplify.configure(cognitoConfig, {
  ssr: false, // Not using server-side rendering
});
