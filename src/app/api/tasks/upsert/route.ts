import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/appwrite";
import { upsertTask } from "@/lib/data";

const schema = z.object({
  classId: z.string().min(1),
  occurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  done: z.boolean().optional(),
  title: z.string().min(1).optional(),
});

export const POST = async (request: Request) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = schema.parse(await request.json());

    await upsertTask(user.$id, body.classId, body.occurrenceDate, {
      done: body.done,
      title: body.title,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to update task.",
      },
      { status: 400 },
    );
  }
};

