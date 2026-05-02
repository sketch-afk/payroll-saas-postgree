import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    
    // Security check
    if (!session || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, industry, country } = await req.json();

    if (!name || !industry) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await query(
      `UPDATE companies 
       SET name = :name, industry = :industry, country = :country 
       WHERE company_id = :cid`,
      { 
        name: name, 
        industry: industry, 
        country: country || 'India', 
        cid: session.user.companyId 
      }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}