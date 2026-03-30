import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    clientId: string | null;
    isAdmin: boolean | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      clientId: string | null;
      isAdmin: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    clientId: string | null;
    isAdmin: boolean;
    userId: string;
  }
}
