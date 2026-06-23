import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subject = searchParams.get("subject");

  const notes = await prisma.noteSet.findMany({
    where: subject ? { subject } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      subject: true,
      title: true,
      summary: true,
      sourcePages: true,
      targetPages: true,
      originalFilename: true,
      originalSizeBytes: true,
      // Don't ship the base64 blob in list responses — viewers fetch it from /file.
      createdAt: true,
    },
  });

  return NextResponse.json(notes);
}
