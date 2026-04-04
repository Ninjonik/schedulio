"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  createClass,
  createSkip,
  createSubtask,
  listClasses,
  listSkipsForRange,
  toggleSubtask,
  updateClass,
  upsertTask,
} from "@/lib/data";
import { inferClassKind } from "@/lib/class-kind";
import { importClassesFromCuniXml } from "@/lib/timetable-import";

const classSchema = z.object({
  title: z.string().min(1),
  classKind: z.enum(["lecture", "lab", "other"]).default("other"),
  code: z.string().optional(),
  weekday: z.coerce.number().min(1).max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  weekPattern: z.enum(["all", "odd", "even"]),
  location: z.string().optional(),
  descriptionMd: z.string().optional(),
  imageUrl: z.string().optional(),
  color: z.string().optional(),
});

export const addClassAction = async (formData: FormData) => {
  const user = await requireUser();

  const parsed = classSchema.safeParse({
    title: formData.get("title"),
    classKind: formData.get("classKind") || "other",
    code: formData.get("code") || undefined,
    weekday: formData.get("weekday"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    weekPattern: formData.get("weekPattern"),
    location: formData.get("location") || undefined,
    descriptionMd: formData.get("descriptionMd") || undefined,
    imageUrl: formData.get("imageUrl") || undefined,
    color: formData.get("color") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid class form data.");
  }

  await createClass(user.$id, parsed.data);
  revalidatePath("/classes");
  revalidatePath("/calendar");
};

export const addSkipAction = async (formData: FormData) => {
  const user = await requireUser();

  const classId = z.string().min(1).parse(formData.get("classId"));
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(formData.get("date"));
  const reason = z.string().optional().parse(formData.get("reason") || undefined);

  await createSkip(user.$id, classId, date, reason);

  revalidatePath("/classes");
  revalidatePath("/calendar");
};

export const toggleTaskDoneAction = async (formData: FormData) => {
  const user = await requireUser();

  const classId = z.string().min(1).parse(formData.get("classId"));
  const occurrenceDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .parse(formData.get("occurrenceDate"));
  const done = formData.get("done") === "true";

  await upsertTask(user.$id, classId, occurrenceDate, {
    done,
  });

  revalidatePath("/calendar");
};

export const saveTaskNotesAction = async (formData: FormData) => {
  const user = await requireUser();

  const classId = z.string().min(1).parse(formData.get("classId"));
  const occurrenceDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .parse(formData.get("occurrenceDate"));

  const title = z.string().min(1).parse(formData.get("title"));
  const notesMd = z.string().optional().parse(formData.get("notesMd") || "");

  await upsertTask(user.$id, classId, occurrenceDate, {
    title,
    notesMd,
  });

  revalidatePath("/calendar");
};

export const addSubtaskAction = async (formData: FormData) => {
  const user = await requireUser();

  const taskId = z.string().min(1).parse(formData.get("taskId"));
  const title = z.string().min(1).parse(formData.get("title"));

  await createSubtask(user.$id, taskId, title);

  revalidatePath("/calendar");
};

export const toggleSubtaskAction = async (formData: FormData) => {
  const user = await requireUser();

  const subtaskId = z.string().min(1).parse(formData.get("subtaskId"));
  const done = formData.get("done") === "true";

  await toggleSubtask(user.$id, subtaskId, done);

  revalidatePath("/calendar");
};

export const updateClassKindAction = async (formData: FormData) => {
  const user = await requireUser();

  const classId = z.string().min(1).parse(formData.get("classId"));
  const classKind = z.enum(["lecture", "lab", "other"]).parse(formData.get("classKind"));

  const ownedClasses = await listClasses(user.$id);
  if (!ownedClasses.some((classRow) => classRow.$id === classId)) {
    throw new Error("Class not found.");
  }

  await updateClass(classId, { classKind });

  revalidatePath("/classes");
  revalidatePath("/calendar");
};

export const importCuniScheduleAction = async (formData: FormData) => {
  const user = await requireUser();
  const xmlFile = formData.get("xmlFile");

  if (!(xmlFile instanceof File)) {
    throw new Error("Please upload an XML file.");
  }

  if (!xmlFile.name.toLowerCase().endsWith(".xml")) {
    throw new Error("Only .xml files are supported.");
  }

  const xml = await xmlFile.text();
  const imported = await importClassesFromCuniXml(xml);
  const existingClasses = await listClasses(user.$id);

  const buildClassBaseKey = (item: {
    title: string;
    weekday: number;
    startTime: string;
    endTime: string;
    location?: string;
  }) =>
    [
      item.title,
      item.weekday,
      item.startTime,
      item.endTime,
      item.location ?? "",
    ].join("|");

  const buildClassKeyWithKind = (
    item: {
      title: string;
      weekday: number;
      startTime: string;
      endTime: string;
      location?: string;
    },
    kind: string,
  ) => [buildClassBaseKey(item), kind].join("|");

  const classIdsByKey = new Map(
    existingClasses.map((classRow) => [
      buildClassKeyWithKind(classRow, classRow.classKind ?? inferClassKind(classRow.title, classRow.descriptionMd)),
      classRow.$id,
    ]),
  );

  const classIdsByBaseKey = new Map<string, string[]>();
  for (const classRow of existingClasses) {
    const key = buildClassBaseKey(classRow);
    const list = classIdsByBaseKey.get(key) ?? [];
    list.push(classRow.$id);
    classIdsByBaseKey.set(key, list);
  }

  const existingClassById = new Map(existingClasses.map((classRow) => [classRow.$id, classRow]));

  const sortedSkipDates = imported
    .flatMap((item) => item.skips.map((skip) => skip.date))
    .sort();
  const minSkipDate = sortedSkipDates[0];
  const maxSkipDate = sortedSkipDates.at(-1);
  const existingSkips =
    minSkipDate && maxSkipDate
      ? await listSkipsForRange(user.$id, minSkipDate, maxSkipDate)
      : [];

  const existingSkipKeys = new Set(
    existingSkips.map((skip) => `${skip.classId}|${skip.date}`),
  );

  for (const item of imported) {
    const importedKind = item.classKind;
    const classBaseKey = buildClassBaseKey(item);
    const classKey = buildClassKeyWithKind(item, importedKind);

    let classId = classIdsByKey.get(classKey);

    if (!classId) {
      const legacyIds = classIdsByBaseKey.get(classBaseKey) ?? [];
      if (legacyIds.length === 1) {
        classId = legacyIds[0];
        classIdsByKey.set(classKey, classId);
      }
    }

    if (!classId) {
      const created = await createClass(user.$id, {
        title: item.title,
        classKind: item.classKind,
        weekday: item.weekday,
        startTime: item.startTime,
        endTime: item.endTime,
        weekPattern: item.weekPattern,
        location: item.location,
        descriptionMd: item.descriptionMd,
      });

      classId = created.$id;
      classIdsByKey.set(classKey, classId);
      classIdsByBaseKey.set(classBaseKey, [...(classIdsByBaseKey.get(classBaseKey) ?? []), classId]);
      existingClassById.set(classId, created);
    } else {
      const existing = existingClassById.get(classId);

      if (
        existing &&
        ((existing.classKind ?? "other") !== item.classKind ||
          existing.weekPattern !== item.weekPattern ||
          (existing.location ?? "") !== (item.location ?? "") ||
          (existing.descriptionMd ?? "") !== (item.descriptionMd ?? ""))
      ) {
        await updateClass(classId, {
          classKind: item.classKind,
          weekPattern: item.weekPattern,
          location: item.location,
          descriptionMd: item.descriptionMd,
        });

        existingClassById.set(classId, {
          ...existing,
          classKind: item.classKind,
          weekPattern: item.weekPattern,
          location: item.location,
          descriptionMd: item.descriptionMd,
        });
      }
    }

    for (const skip of item.skips) {
      const skipKey = `${classId}|${skip.date}`;
      if (existingSkipKeys.has(skipKey)) {
        continue;
      }

      await createSkip(user.$id, classId, skip.date, skip.reason);
      existingSkipKeys.add(skipKey);
    }
  }

  revalidatePath("/classes");
  revalidatePath("/calendar");
};

