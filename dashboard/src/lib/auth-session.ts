import { auth } from '@/auth';
import { redirect } from 'next/navigation';

/**
 * Use in Server Components and Route Handlers.
 * Returns the session or redirects to /login.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.clientId) {
    redirect('/login');
  }
  return session;
}

/**
 * Use in API Route Handlers — throws instead of redirecting.
 */
export async function requireAuthApi(): Promise<{
  clientId: string;
  userId: string;
  isAdmin: boolean;
}> {
  const session = await auth();
  if (!session?.user?.clientId) {
    throw new Error('UNAUTHORIZED');
  }
  return {
    clientId: session.user.clientId,
    userId: session.user.id,
    isAdmin: session.user.isAdmin,
  };
}
