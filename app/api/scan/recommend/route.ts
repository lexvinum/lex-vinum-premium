import { NextRequest, NextResponse } from "next/server";
import { extractWinesFromOcr } from "@/lib/ocr-extract-wines";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const extractedText = String(body?.extractedText || "");

    if (!extractedText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucun texte OCR reçu.",
        },
        { status: 400 },
      );
    }

    const wines = extractWinesFromOcr(extractedText);

    return NextResponse.json({
      success: true,
      extractedText,
      wines,
    });
  } catch (error) {
    console.error("SCAN_EXTRACT_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erreur pendant l’extraction OCR des vins.",
      },
      { status: 500 },
    );
  }
}