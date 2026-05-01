import { getServerSession } from 'next-auth';
// Ensure this path matches your actual NextAuth route file
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Retrieves the current session on the server side.
 * Works in Server Components, Server Actions, and API Routes.
 */
export async function getSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error("Session retrieval error:", error);
    return null;
  }
}

/**
 * Strict check for multi-tenant SaaS logic.
 * Returns company_id if present, otherwise throws a specific error.
 */
export async function requireCompany() {
  const session = await getSession();
  
  // Checks both if session exists and if companyId is attached to the user
  const companyId = session?.user?.companyId;

  if (!companyId) {
    // We throw a specific string to catch it in the API route try/catch block
    throw new Error('UNAUTHORIZED_ACCESS');
  }

  // Convert to Number to maintain consistency with your DB logic (Oracle NUMBER -> PG INT)
  return Number(companyId);
}

/**
 * Standardized API Response Helpers
 */

export function unauthorized(message = 'Unauthorized: Please log in to continue.') {
  return Response.json({ error: message }, { status: 401 });
}

export function badRequest(msg = 'Invalid request parameters.') {
  return Response.json({ error: msg }, { status: 400 });
}

export function serverError(err) {
  // Log the full error for debugging in Vercel logs
  console.error("Internal Server Error Log:", err);
  
  return Response.json(
    { 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err?.message : undefined 
    }, 
    { status: 500 }
  );
}