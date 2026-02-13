import { NextResponse } from "next/server";
import { isPasswordAuthConfigured } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({
    configured: isPasswordAuthConfigured(),
  });
}
