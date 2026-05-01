import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '@/lib/db';

export async function POST(req) {
  try {
    const { name, email, password, industry, country } = await req.json();

    if (!name || !email || !password)
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });

    if (password.length < 6)
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

    // Check duplicate
    const existing = await queryOne(
      `SELECT company_id FROM companies WHERE LOWER(email) = LOWER(:email)`,
      { email }
    );
    if (existing)
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });

    const hash = await bcrypt.hash(password, 12);

    await query(
      `INSERT INTO companies (name, email, password_hash, industry, country, is_active)
       VALUES (:name, :email, :hash, :industry, :country, 1)`,
      {
        name,
        email,
        hash,
        industry: industry || null,
        country:  country  || 'India',
      }
    );

    return NextResponse.json({ message: 'Company registered successfully' }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
