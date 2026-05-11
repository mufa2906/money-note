import { NextResponse } from "next/server"

export async function GET() {
  const available =
    !!process.env.GEMINI_API_KEY &&
    process.env.AI_OCR_DISABLED !== "true"

  return NextResponse.json({ available })
}
