import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/appwrite";
import { createSubtask, toggleSubtask, upsertTask } from "@/lib/data";

const createSchema = z.object({
  classId: z.string().min(1),
  occurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1),
});

const toggleSchema = z.object({
  subtaskId: z.string().min(1),
  done: z.boolean(),
});

export const POST = async (request: Request) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = createSchema.parse(await request.json());

    const task = await upsertTask(user.$id, body.classId, body.occurrenceDate, {});
    await createSubtask(user.$id, task.$id, body.title.trim());

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to create subtask.",
      },
      { status: 400 },
    );
  }
};

export const PATCH = async (request: Request) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = toggleSchema.parse(await request.json());
    await toggleSubtask(user.$id, body.subtaskId, body.done);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to update subtask.",
      },
      { status: 400 },
    );
  }
};

