import "server-only";

import { createAdminClient, ID, Permission, Query, Role } from "@/lib/appwrite";
import type { ClassKind } from "@/lib/class-kind";
import { env } from "@/lib/env";
import type { ClassRow, SkipRow, SubtaskRow, TaskRow, WeekPattern } from "@/lib/types";

type ClassCreateInput = {
  title: string;
  classKind?: ClassKind;
  code?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  weekPattern: WeekPattern;
  location?: string;
  descriptionMd?: string;
  imageUrl?: string;
  color?: string;
};

type ClassUpdateInput = Partial<ClassCreateInput>;

const tableIds = {
  classes: env.APPWRITE_CLASSES_TABLE_ID,
  skips: env.APPWRITE_SKIPS_TABLE_ID,
  tasks: env.APPWRITE_TASKS_TABLE_ID,
  subtasks: env.APPWRITE_SUBTASKS_TABLE_ID,
};

const dbId = env.APPWRITE_DATABASE_ID;
type TablesDBClient = ReturnType<typeof createAdminClient>["tablesDB"];

const ownerPermissions = (ownerId: string) => [
  Permission.read(Role.user(ownerId)),
  Permission.update(Role.user(ownerId)),
  Permission.delete(Role.user(ownerId)),
];

const assertOwnedClass = async (tablesDB: TablesDBClient, ownerId: string, classId: string) => {
  const classRow = await tablesDB.getRow<ClassRow>({
    databaseId: dbId,
    tableId: tableIds.classes,
    rowId: classId,
  });

  if (classRow.ownerId !== ownerId) {
    throw new Error("Class not found.");
  }

  return classRow;
};

const assertOwnedTask = async (tablesDB: TablesDBClient, ownerId: string, taskId: string) => {
  const task = await tablesDB.getRow<TaskRow>({
    databaseId: dbId,
    tableId: tableIds.tasks,
    rowId: taskId,
  });

  if (task.ownerId !== ownerId) {
    throw new Error("Task not found.");
  }

  return task;
};

const assertOwnedSubtask = async (tablesDB: TablesDBClient, ownerId: string, subtaskId: string) => {
  const subtask = await tablesDB.getRow<SubtaskRow>({
    databaseId: dbId,
    tableId: tableIds.subtasks,
    rowId: subtaskId,
  });

  if (subtask.ownerId !== ownerId) {
    throw new Error("Subtask not found.");
  }

  return subtask;
};

export const listClasses = async (ownerId: string) => {
  const { tablesDB } = createAdminClient();
  const rows = await tablesDB.listRows<ClassRow>({
    databaseId: dbId,
    tableId: tableIds.classes,
    queries: [Query.equal("ownerId", [ownerId]), Query.orderAsc("weekday")],
    total: false,
  });

  return rows.rows;
};

export const createClass = async (
  ownerId: string,
  payload: ClassCreateInput,
) => {
  const { tablesDB } = createAdminClient();
  return tablesDB.createRow<ClassRow>({
    databaseId: dbId,
    tableId: tableIds.classes,
    rowId: ID.unique(),
    data: {
      ownerId,
      ...payload,
    },
    permissions: ownerPermissions(ownerId),
  });
};

export const updateClass = async (
  ownerId: string,
  classId: string,
  payload: ClassUpdateInput,
) => {
  const { tablesDB } = createAdminClient();
  await assertOwnedClass(tablesDB, ownerId, classId);
  return tablesDB.updateRow<ClassRow>({
    databaseId: dbId,
    tableId: tableIds.classes,
    rowId: classId,
    data: payload,
  });
};

export const listSkipsForRange = async (
  ownerId: string,
  fromIsoDate: string,
  toIsoDate: string,
) => {
  const { tablesDB } = createAdminClient();
  const rows = await tablesDB.listRows<SkipRow>({
    databaseId: dbId,
    tableId: tableIds.skips,
    queries: [
      Query.equal("ownerId", [ownerId]),
      Query.greaterThanEqual("date", fromIsoDate),
      Query.lessThanEqual("date", toIsoDate),
    ],
    total: false,
  });

  return rows.rows;
};

export const createSkip = async (
  ownerId: string,
  classId: string,
  date: string,
  reason?: string,
) => {
  const { tablesDB } = createAdminClient();
  await assertOwnedClass(tablesDB, ownerId, classId);

  return tablesDB.createRow<SkipRow>({
    databaseId: dbId,
    tableId: tableIds.skips,
    rowId: ID.unique(),
    data: {
      ownerId,
      classId,
      date,
      reason,
    },
    permissions: ownerPermissions(ownerId),
  });
};

export const listTasksForRange = async (
  ownerId: string,
  fromIsoDate: string,
  toIsoDate: string,
) => {
  const { tablesDB } = createAdminClient();
  const rows = await tablesDB.listRows<TaskRow>({
    databaseId: dbId,
    tableId: tableIds.tasks,
    queries: [
      Query.equal("ownerId", [ownerId]),
      Query.greaterThanEqual("occurrenceDate", fromIsoDate),
      Query.lessThanEqual("occurrenceDate", toIsoDate),
    ],
    total: false,
  });

  return rows.rows;
};

export const findTaskByOccurrence = async (
  ownerId: string,
  classId: string,
  occurrenceDate: string,
) => {
  const { tablesDB } = createAdminClient();
  const rows = await tablesDB.listRows<TaskRow>({
    databaseId: dbId,
    tableId: tableIds.tasks,
    queries: [
      Query.equal("ownerId", [ownerId]),
      Query.equal("classId", [classId]),
      Query.equal("occurrenceDate", [occurrenceDate]),
      Query.limit(1),
    ],
    total: false,
  });

  return rows.rows[0] ?? null;
};

export const upsertTask = async (
  ownerId: string,
  classId: string,
  occurrenceDate: string,
  updates: Partial<Pick<TaskRow, "done" | "title" | "notesMd">>,
) => {
  const { tablesDB } = createAdminClient();
  const existing = await findTaskByOccurrence(ownerId, classId, occurrenceDate);

  const updateData = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  ) as Partial<Pick<TaskRow, "done" | "title" | "notesMd">>;

  if (existing) {
    if (Object.keys(updateData).length === 0) {
      return existing;
    }

    return tablesDB.updateRow<TaskRow>({
      databaseId: dbId,
      tableId: tableIds.tasks,
      rowId: existing.$id,
      data: updateData,
    });
  }

  await assertOwnedClass(tablesDB, ownerId, classId);

  return tablesDB.createRow<TaskRow>({
    databaseId: dbId,
    tableId: tableIds.tasks,
    rowId: ID.unique(),
    data: {
      ownerId,
      classId,
      occurrenceDate,
      done: updates.done ?? false,
      title: updates.title ?? "Class log",
      notesMd: updates.notesMd ?? "",
    },
    permissions: ownerPermissions(ownerId),
  });
};

export const listSubtasksForTaskIds = async (
  ownerId: string,
  taskIds: string[],
) => {
  if (taskIds.length === 0) {
    return [];
  }

  const { tablesDB } = createAdminClient();
  const rows = await tablesDB.listRows<SubtaskRow>({
    databaseId: dbId,
    tableId: tableIds.subtasks,
    queries: [Query.equal("ownerId", [ownerId]), Query.equal("taskId", taskIds)],
    total: false,
  });

  return rows.rows;
};

export const createSubtask = async (
  ownerId: string,
  taskId: string,
  title: string,
) => {
  const { tablesDB } = createAdminClient();
  await assertOwnedTask(tablesDB, ownerId, taskId);

  return tablesDB.createRow<SubtaskRow>({
    databaseId: dbId,
    tableId: tableIds.subtasks,
    rowId: ID.unique(),
    data: {
      ownerId,
      taskId,
      title,
      done: false,
    },
    permissions: ownerPermissions(ownerId),
  });
};

export const toggleSubtask = async (
  ownerId: string,
  subtaskId: string,
  done: boolean,
) => {
  const { tablesDB } = createAdminClient();
  await assertOwnedSubtask(tablesDB, ownerId, subtaskId);
  return tablesDB.updateRow<SubtaskRow>({
    databaseId: dbId,
    tableId: tableIds.subtasks,
    rowId: subtaskId,
    data: {
      done,
    },
  });
};

