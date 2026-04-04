import "server-only";

import { addWeeks, format, getISOWeek, getISODay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { XMLParser } from "fast-xml-parser";
import type { ClassKind } from "@/lib/class-kind";

const PRAGUE_TIMEZONE = "Europe/Prague";

type ImportedEvent = {
  title: string;
  location?: string;
  teacherLine?: string;
  eventType?: string;
  classKind: ClassKind;
  start: Date;
  end: Date;
};

export type ImportedClass = {
  title: string;
  classKind: ClassKind;
  location?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  weekPattern: "all" | "odd" | "even";
  descriptionMd?: string;
  skips: { date: string; reason: string }[];
};

const toArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

const readText = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = readText(item);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    const textRecord = value as Record<string, unknown>;

    for (const key of ["text", "#text", "value", "date-time"]) {
      const candidate = textRecord[key];
      if (typeof candidate === "string") {
        return candidate.trim();
      }
    }
  }

  return undefined;
};

const parseDateTime = (value: string) => {
  if (!/^\d{8}T\d{6}Z$/.test(value)) {
    throw new Error(`Unsupported date-time format: ${value}`);
  }

  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`;
  return new Date(iso);
};

const normalizeClassKind = (eventType?: string, location?: string): ClassKind => {
  const normalized = (eventType ?? "").trim().toLowerCase();

  // Prefer lab-like signals first so mixed strings do not default to lecture.
  if (["reservation", "lab", "exercise", "seminar", "cvic", "tutorial", "praktikum"].some((needle) => normalized.includes(needle))) {
    return "lab";
  }

  if (["lecture", "prednaska", "predn"].some((needle) => normalized.includes(needle))) {
    return "lecture";
  }

  return (location ?? "").trim().toUpperCase() === "N1" ? "lecture" : "lab";
};

const extractEventType = (data?: Record<string, unknown>) => readText(data?.["event-type"]);

const inferPattern = (dates: Date[]): "all" | "odd" | "even" => {
  const parities = new Set(dates.map((date) => getISOWeek(date) % 2));

  if (parities.size === 1) {
    return parities.has(1) ? "odd" : "even";
  }

  return "all";
};

const buildSkips = (
  dates: Date[],
  pattern: "all" | "odd" | "even",
): { date: string; reason: string }[] => {
  if (dates.length === 0) {
    return [];
  }

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const present = new Set(sorted.map((date) => format(date, "yyyy-MM-dd")));

  let cursor = sorted[0];
  const end = sorted[sorted.length - 1];
  const skips: { date: string; reason: string }[] = [];

  while (cursor.getTime() <= end.getTime()) {
    const isoDate = format(cursor, "yyyy-MM-dd");
    const weekParity = getISOWeek(cursor) % 2;

    const shouldExist =
      pattern === "all" ||
      (pattern === "odd" && weekParity === 1) ||
      (pattern === "even" && weekParity === 0);

    if (shouldExist && !present.has(isoDate)) {
      skips.push({ date: isoDate, reason: "Imported holiday / cancellation" });
    }

    cursor = addWeeks(cursor, 1);
  }

  return skips;
};

const parseEvents = (xml: string): ImportedEvent[] => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false,
  });

  const parsed = parser.parse(xml) as {
    icalendar?: {
      vcalendar?: {
        components?: {
          vevent?: unknown;
        };
      };
    };
  };

  const events = toArray(
    parsed.icalendar?.vcalendar?.components?.vevent as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined,
  );

  const mapped = events.map((event): ImportedEvent | null => {
      const startRaw = readText((event.dtstart as { "date-time"?: unknown } | undefined)?.["date-time"]);
      const endRaw = readText((event.dtend as { "date-time"?: unknown } | undefined)?.["date-time"]);

      if (!startRaw || !endRaw) {
        return null;
      }

      const startUtc = parseDateTime(startRaw);
      const endUtc = parseDateTime(endRaw);

      const start = toZonedTime(startUtc, PRAGUE_TIMEZONE);
      const end = toZonedTime(endUtc, PRAGUE_TIMEZONE);

      const data = event.data as Record<string, unknown> | undefined;
      const teachers = toArray((data?.teachers as { teacher?: unknown } | undefined)?.teacher as Record<string, unknown> | Record<string, unknown>[] | undefined)
        .map((teacher) => {
          const firstName = readText(teacher["first-name"]);
          const lastName = readText(teacher["last-name"]);
          return [firstName, lastName].filter(Boolean).join(" ").trim();
        })
        .filter(Boolean)
        .join(", ");

      const eventType = extractEventType(data);
      const location =
        readText((event.location as { text?: unknown } | undefined)?.text) ??
        readText((data?.room as { acronym?: unknown } | undefined)?.acronym);

      return {
        title: readText((event.summary as { text?: unknown } | undefined)?.text) ?? "Untitled class",
        location,
        teacherLine: teachers || undefined,
        eventType,
        classKind: normalizeClassKind(eventType, location),
        start,
        end,
      } satisfies ImportedEvent;
    });

  return mapped.filter((event): event is ImportedEvent => event !== null);
};

export const importClassesFromCuniXml = async (xml: string): Promise<ImportedClass[]> => {
  const events = parseEvents(xml);

  if (events.length === 0) {
    throw new Error("No timetable events were found in the uploaded XML file.");
  }

  const grouped = new Map<string, ImportedEvent[]>();

  for (const event of events) {
    const key = [
      event.title,
      event.location ?? "",
      event.classKind,
      getISODay(event.start),
      format(event.start, "HH:mm"),
      format(event.end, "HH:mm"),
    ].join("|");

    const list = grouped.get(key) ?? [];
    list.push(event);
    grouped.set(key, list);
  }

  return Array.from(grouped.values()).map((group) => {
    const [first] = group;
    const dates = group.map((event) => event.start);
    const pattern = inferPattern(dates);
    const classKinds = Array.from(new Set(group.map((event) => event.classKind)));
    const classKind = classKinds.length === 1 ? classKinds[0] : "other";
    const teacherLine = Array.from(new Set(group.map((event) => event.teacherLine).filter(Boolean))).join(", ");
    const eventTypes = Array.from(new Set(group.map((event) => event.eventType).filter(Boolean))).join(", ");

    return {
      title: first.title,
      classKind,
      location: first.location,
      weekday: getISODay(first.start),
      startTime: format(first.start, "HH:mm"),
      endTime: format(first.end, "HH:mm"),
      weekPattern: pattern,
      descriptionMd: [
        "Imported from CUNI xCal feed.",
        teacherLine ? `Teachers: ${teacherLine}` : "",
        eventTypes ? `Raw event type: ${eventTypes}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      skips: buildSkips(dates, pattern),
    } satisfies ImportedClass;
  });
};

export const importClassesFromCuniUrl = async (url: string): Promise<ImportedClass[]> => {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "is.cuni.cz") {
    throw new Error("Only https://is.cuni.cz timetable URLs are allowed.");
  }

  const response = await fetch(parsedUrl.toString(), {
    headers: { accept: "application/xml,text/xml" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch timetable URL (${response.status}).`);
  }

  const xml = await response.text();
  return importClassesFromCuniXml(xml);
};


