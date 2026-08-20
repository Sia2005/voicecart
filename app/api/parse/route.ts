import { NextResponse } from "next/server";
import { z } from "zod";
import { parseCommand } from "@/lib/nlp";

const requestSchema = z.object({
  transcript: z.string().min(1).max(300),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedBody = requestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "transcript must be a string of 1 to 300 characters" },
      { status: 400 }
    );
  }

  try {
    const command = await parseCommand(parsedBody.data.transcript);
    return NextResponse.json(command);
  } catch {
    return NextResponse.json({ error: "Failed to parse command" }, { status: 500 });
  }
}