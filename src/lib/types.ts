import type { Models } from "node-appwrite";
import type { ClassKind } from "@/lib/class-kind";

export type WeekPattern = "all" | "odd" | "even";

type BaseRow = Models.Row;

export type ClassRow = BaseRow & {
  ownerId: string;
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

export type SkipRow = BaseRow & {
  ownerId: string;
  classId: string;
  date: string;
  reason?: string;
};

export type TaskRow = BaseRow & {
  ownerId: string;
  classId: string;
  occurrenceDate: string;
  title: string;
  notesMd?: string;
  done: boolean;
};

export type SubtaskRow = BaseRow & {
  ownerId: string;
  taskId: string;
  title: string;
  done: boolean;
};

export type ClassOccurrence = {
  classRow: ClassRow;
  date: Date;
  isoDate: string;
  task?: TaskRow;
  subtasks: SubtaskRow[];
  skipped: boolean;
  skipReason?: string;
};

