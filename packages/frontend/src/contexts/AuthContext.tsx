import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signIn, 
  signOut, 
  getCurrentUser, 
  fetchAuthSession,
} from 'aws-amplify/auth';

interface User {
  email: string;
  name: string;
  sub: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      if (currentUser && session.tokens) {
        const email = session.tokens.idToken?.payload.email as string || '';
        const cognitoUsername = session.tokens.idToken?.payload['cognito:username'] as string || '';
        
        // Use cognito:username (actual username like "admin")
        // Fallback to name attribute, then email prefix
        const name = cognitoUsername || 
                     session.tokens.idToken?.payload.name as string || 
                     email.split('@')[0];
        
        setUser({
          email,
          name,
          sub: currentUser.userId,
        });
      }
    } catch (error) {
      console.log('No authenticated user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const { isSignedIn } = await signIn({
        username: email,
        password,
        options: {
          // Remember Me: Use longer session duration
          authFlowType: rememberMe ? 'USER_SRP_AUTH' : 'USER_SRP_AUTH',
        },
      });

      if (isSignedIn) {
        await checkUser();
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || '로그인에 실패했습니다');
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken?.toString() || null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
