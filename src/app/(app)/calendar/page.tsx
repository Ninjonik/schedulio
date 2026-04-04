import Link from "next/link";
import { addDays, format, subDays } from "date-fns";
import {
  addSubtaskAction,
  saveTaskNotesAction,
  toggleSubtaskAction,
  toggleTaskDoneAction,
} from "@/app/actions";
import { CalendarWeekView } from "@/components/calendar-week-view";
import { MarkdownPreview } from "@/components/markdown-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/auth";
import { inferClassKind } from "@/lib/class-kind";
import { listClasses, listSkipsForRange, listSubtasksForTaskIds, listTasksForRange } from "@/lib/data";
import { buildOccurrences, getWeekStart, toIsoDate } from "@/lib/schedule";

const outlineLinkClass =
  "group/button inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-muted";

const primaryLinkClass =
  "group/button inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium whitespace-nowrap text-primary-foreground transition-all outline-none hover:bg-primary/80";

const ghostLinkClass =
  "group/button inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all outline-none hover:bg-muted hover:text-foreground";

type Props = {
  searchParams: Promise<{
    week?: string;
    view?: string;
  }>;
};

const toDate = (value?: string) => {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const combineIsoDateAndTime = (isoDate: string, time: string) => `${isoDate}T${time}:00`;


export default async function CalendarPage({ searchParams }: Props) {
  const user = await requireUser();
  const params = await searchParams;
  const viewMode = params.view === "list" ? "list" : "week";

  const anchorDate = toDate(params.week);
  const weekStart = getWeekStart(anchorDate);
  const weekEnd = addDays(weekStart, 6);

  const from = toIsoDate(weekStart);
  const to = toIsoDate(weekEnd);

  const [classes, skips, tasks] = await Promise.all([
    listClasses(user.$id),
    listSkipsForRange(user.$id, from, to),
    listTasksForRange(user.$id, from, to),
  ]);

  const subtasks = await listSubtasksForTaskIds(
    user.$id,
    tasks.map((task) => task.$id),
  );

  const occurrences = buildOccurrences(classes, skips, tasks, subtasks, weekStart);

  const previousWeek = toIsoDate(subDays(weekStart, 7));
  const nextWeek = toIsoDate(addDays(weekStart, 7));
  const activeWeek = toIsoDate(weekStart);

  const buildCalendarHref = (week: string, view: "week" | "list") =>
    `/calendar?week=${week}&view=${view}`;

  const weekEvents = occurrences.map((occurrence) => ({
    id: `${occurrence.classRow.$id}-${occurrence.isoDate}`,
    title: occurrence.classRow.title,
    start: combineIsoDateAndTime(occurrence.isoDate, occurrence.classRow.startTime),
    end: combineIsoDateAndTime(occurrence.isoDate, occurrence.classRow.endTime),
    location: occurrence.classRow.location,
    done: occurrence.task?.done ?? false,
    skipped: occurrence.skipped,
    classId: occurrence.classRow.$id,
    occurrenceDate: occurrence.isoDate,
    taskTitle: occurrence.task?.title,
    kind: occurrence.classRow.classKind ?? inferClassKind(occurrence.classRow.title, occurrence.classRow.descriptionMd),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Week planner</h1>
          <p className="text-sm text-muted-foreground">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={buildCalendarHref(previousWeek, viewMode)} className={outlineLinkClass}>
            Previous
          </Link>
          <Link href={buildCalendarHref(toIsoDate(new Date()), viewMode)} className={outlineLinkClass}>
            Today
          </Link>
          <Link href={buildCalendarHref(nextWeek, viewMode)} className={primaryLinkClass}>
            Next
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        <Link href={buildCalendarHref(activeWeek, "week")} className={viewMode === "week" ? primaryLinkClass : ghostLinkClass}>
          Weekly calendar
        </Link>
        <Link href={buildCalendarHref(activeWeek, "list")} className={viewMode === "list" ? primaryLinkClass : ghostLinkClass}>
          Split-day list
        </Link>
      </div>

      {viewMode === "week" ? (
        <CalendarWeekView weekStartIsoDate={activeWeek} events={weekEvents} />
      ) : (
      <div className="grid gap-4">
        {occurrences.length === 0 ? (
          <Card className="shadow-none">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No classes in this week. Add classes first.
            </CardContent>
          </Card>
        ) : null}

        {occurrences.map((occurrence) => (
          <Card key={`${occurrence.classRow.$id}:${occurrence.isoDate}`} className="shadow-none">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg">
                  {occurrence.classRow.title} - {format(occurrence.date, "EEE, MMM d")}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{occurrence.classRow.startTime}</Badge>
                  <Badge variant="outline">{occurrence.classRow.weekPattern}</Badge>
                  <Badge variant="outline">{occurrence.classRow.classKind ?? inferClassKind(occurrence.classRow.title, occurrence.classRow.descriptionMd)}</Badge>
                  {occurrence.skipped ? <Badge variant="destructive">Skipped</Badge> : null}
                </div>
              </div>
              {occurrence.classRow.location ? (
                <p className="text-sm text-muted-foreground">{occurrence.classRow.location}</p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {occurrence.skipped ? (
                <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                  {occurrence.skipReason || "Class skipped for this date."}
                </p>
              ) : null}

              <form action={toggleTaskDoneAction} className="flex items-center gap-3">
                <input type="hidden" name="classId" value={occurrence.classRow.$id} />
                <input type="hidden" name="occurrenceDate" value={occurrence.isoDate} />
                <input
                  type="hidden"
                  name="done"
                  value={occurrence.task?.done ? "false" : "true"}
                />
                <Checkbox checked={occurrence.task?.done ?? false} />
                <span className="text-sm">Mark class done</span>
                <Button type="submit" variant="outline" size="sm">
                  Save
                </Button>
              </form>

              <form action={saveTaskNotesAction} className="space-y-2">
                <input type="hidden" name="classId" value={occurrence.classRow.$id} />
                <input type="hidden" name="occurrenceDate" value={occurrence.isoDate} />
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`title-${occurrence.classRow.$id}-${occurrence.isoDate}`}>
                      Task title
                    </Label>
                    <Input
                      id={`title-${occurrence.classRow.$id}-${occurrence.isoDate}`}
                      name="title"
                      defaultValue={occurrence.task?.title ?? "Class task"}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`notes-${occurrence.classRow.$id}-${occurrence.isoDate}`}>
                    Notes (Markdown)
                  </Label>
                  <Textarea
                    id={`notes-${occurrence.classRow.$id}-${occurrence.isoDate}`}
                    name="notesMd"
                    rows={4}
                    defaultValue={occurrence.task?.notesMd ?? ""}
                  />
                </div>
                <Button type="submit" size="sm">
                  Save notes
                </Button>
              </form>

              {occurrence.task?.notesMd ? (
                <div className="rounded-md border border-border bg-background p-3">
                  <MarkdownPreview content={occurrence.task.notesMd} />
                </div>
              ) : null}

              {occurrence.task ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Subtasks</h4>

                  {occurrence.subtasks.map((subtask) => (
                    <form action={toggleSubtaskAction} key={subtask.$id} className="flex items-center gap-2">
                      <input type="hidden" name="subtaskId" value={subtask.$id} />
                      <input type="hidden" name="done" value={subtask.done ? "false" : "true"} />
                      <Checkbox checked={subtask.done} />
                      <span className="text-sm">{subtask.title}</span>
                      <Button type="submit" variant="ghost" size="sm">
                        Toggle
                      </Button>
                    </form>
                  ))}

                  <form action={addSubtaskAction} className="flex gap-2">
                    <input type="hidden" name="taskId" value={occurrence.task.$id} />
                    <Input name="title" placeholder="New subtask" required />
                    <Button type="submit" size="sm" variant="outline">
                      Add
                    </Button>
                  </form>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}

