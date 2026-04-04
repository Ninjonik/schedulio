import {
  addDays,
  format,
  getISODay,
  getISOWeek,
  parseISO,
  startOfWeek,
} from "date-fns";
import type {
  ClassOccurrence,
  ClassRow,
  SkipRow,
  SubtaskRow,
  TaskRow,
  WeekPattern,
} from "@/lib/types";

export const getWeekStart = (date: Date) =>
  startOfWeek(date, { weekStartsOn: 1 });

export const toIsoDate = (date: Date) => format(date, "yyyy-MM-dd");

export const parseIsoDate = (value: string) => parseISO(value);

const isPatternActive = (pattern: WeekPattern, date: Date) => {
  if (pattern === "all") {
    return true;
  }

  const week = getISOWeek(date);
  const isOddWeek = week % 2 === 1;

  return pattern === "odd" ? isOddWeek : !isOddWeek;
};

export const buildWeekDays = (weekStart: Date) =>
  Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

export const buildOccurrences = (
  classes: ClassRow[],
  skips: SkipRow[],
  tasks: TaskRow[],
  subtasks: SubtaskRow[],
  weekStart: Date,
): ClassOccurrence[] => {
  const skipMap = new Map(
    skips.map((skip) => [`${skip.classId}:${skip.date}`, skip]),
  );

  const taskMap = new Map(
    tasks.map((task) => [`${task.classId}:${task.occurrenceDate}`, task]),
  );

  const subtasksByTask = new Map<string, SubtaskRow[]>();

  for (const subtask of subtasks) {
    const list = subtasksByTask.get(subtask.taskId) ?? [];
    list.push(subtask);
    subtasksByTask.set(subtask.taskId, list);
  }

  const occurrences: ClassOccurrence[] = [];

  for (const classRow of classes) {
    for (const day of buildWeekDays(weekStart)) {
      const isoDay = getISODay(day);
      if (isoDay !== classRow.weekday) {
        continue;
      }

      if (!isPatternActive(classRow.weekPattern, day)) {
        continue;
      }

      const isoDate = toIsoDate(day);
      const skip = skipMap.get(`${classRow.$id}:${isoDate}`);
      const task = taskMap.get(`${classRow.$id}:${isoDate}`);

      occurrences.push({
        classRow,
        date: day,
        isoDate,
        task,
        subtasks: task ? subtasksByTask.get(task.$id) ?? [] : [],
        skipped: Boolean(skip),
        skipReason: skip?.reason,
      });
    }
  }

  return occurrences.sort((a, b) => {
    if (a.isoDate !== b.isoDate) {
      return a.isoDate.localeCompare(b.isoDate);
    }

    return a.classRow.startTime.localeCompare(b.classRow.startTime);
  });
};

