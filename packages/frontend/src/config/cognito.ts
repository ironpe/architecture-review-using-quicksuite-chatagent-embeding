import { Amplify } from 'aws-amplify';

export const cognitoConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || 'us-east-1_NBuxDH6cg',
      userPoolClientId: import.meta.env.VITE_USER_POOL_WEB_CLIENT_ID || '2sgjj80hnjd470a6cgj1oc3bjj',
    },
  },
};

// Initialize Amplify
Amplify.configure(cognitoConfig, {
  ssr: false, // Not using server-side rendering
});
