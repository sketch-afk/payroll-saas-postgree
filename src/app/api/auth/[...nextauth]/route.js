import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '@/lib/db';

export const authOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  providers: [
    // ── Email + Password ──────────────────────────────────────
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const company = await queryOne(
          // FIX 1: Changed `is_active = 1` to `is_active = true`
          `SELECT company_id, name, email, password_hash, logo_url
           FROM companies WHERE LOWER(email) = LOWER(:email) AND is_active = true`,
          { email: credentials.email }
        );

        if (!company || !company.password_hash) return null;

        const valid = await bcrypt.compare(credentials.password, company.password_hash);
        if (!valid) return null;

        return {
          id:        String(company.company_id), 
          companyId: company.company_id,
          name:      company.name,
          email:     company.email,
          image:     company.logo_url ?? null,
        };
      },
    }),

    // ── Google OAuth ──────────────────────────────────────────
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    // 1. signIn is strictly for access control and database upserts
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          let company = await queryOne(
            `SELECT company_id FROM companies WHERE google_id = :gid OR LOWER(email) = LOWER(:email)`,
            { gid: user.id, email: user.email }
          );

          if (!company) {
            // New Google user → auto-register company
            // FIX 2: Changed the hardcoded `1` in VALUES to `true`
            await query(
              `INSERT INTO companies (name, email, google_id, logo_url, is_active)
               VALUES (:name, :email, :gid, :logo, true)`,
              { name: user.name, email: user.email, gid: user.id, logo: user.image ?? null }
            );
          } else {
            // Update google_id and logo if logging in via email match
            await query(
              `UPDATE companies SET google_id = :gid, logo_url = :logo WHERE company_id = :cid`,
              { gid: user.id, logo: user.image ?? null, cid: company.company_id }
            );
          }
          return true; // Allow login
        } catch (err) {
          console.error('Google signIn error:', err);
          return false; // Deny login if DB fails
        }
      }
      return true; // Allow login for credentials
    },

    // 2. jwt attaches custom claims to the token
    async jwt({ token, user, account }) {
      if (account?.provider === 'google') {
        const company = await queryOne(
          `SELECT company_id FROM companies WHERE LOWER(email) = LOWER(:email)`,
          { email: token.email }
        );
        
        if (company) {
          token.companyId = company.company_id;
        }
      } else if (user) {
        token.companyId = user.companyId;
      }
      
      return token;
    },

    // 3. session exposes the token claims to the frontend client
    async session({ session, token }) {
      if (token?.companyId) {
        session.user.companyId = token.companyId;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };