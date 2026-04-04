import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/appwrite";
import { findTaskByOccurrence, listSubtasksForTaskIds } from "@/lib/data";

const querySchema = z.object({
  classId: z.string().min(1),
  occurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const GET = async (request: Request) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse({
      classId: searchParams.get("classId"),
      occurrenceDate: searchParams.get("occurrenceDate"),
    });

    const task = await findTaskByOccurrence(user.$id, query.classId, query.occurrenceDate);

    const subtasks = task
      ? await listSubtasksForTaskIds(user.$id, [task.$id])
      : [];

    return NextResponse.json({
      ok: true,
      task: task
        ? {
            id: task.$id,
            title: task.title,
            done: task.done,
          }
        : null,
      subtasks: subtasks.map((subtask) => ({
        id: subtask.$id,
        title: subtask.title,
        done: subtask.done,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to load event task data.",
      },
      { status: 400 },
    );
  }
};

