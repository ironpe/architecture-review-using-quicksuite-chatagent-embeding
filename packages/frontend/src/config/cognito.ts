import { Amplify } from 'aws-amplify';

export const cognitoConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || 'us-east-1_NBuxDH6cg',
      userPoolClientId: import.meta.env.VITE_USER_POOL_WEB_CLIENT_ID || '2sgjj80hnjd470a6cgj1oc3bjj',
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN || 'arch-review-1767661637.auth.us-east-1.amazoncognito.com',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [import.meta.env.VITE_REDIRECT_SIGN_IN || 'http://localhost:5173'],
          redirectSignOut: [import.meta.env.VITE_REDIRECT_SIGN_OUT || 'http://localhost:5173/login'],
          responseType: 'code',
        },
      },
    },
  },
};

// Initialize Amplify with token refresh configuration
Amplify.configure(cognitoConfig, {
  ssr: false, // Not using server-side rendering
});
