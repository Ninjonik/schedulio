"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type Event as CalendarEvent,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


type WeekCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  done: boolean;
  skipped: boolean;
  classId: string;
  occurrenceDate: string;
  kind: "lecture" | "lab" | "other";
  taskTitle?: string;
};

type Props = {
  weekStartIsoDate: string;
  events: WeekCalendarEvent[];
};

type UiEvent = Omit<WeekCalendarEvent, "start" | "end"> & CalendarEvent;

type EventTaskData = {
  task: {
    id: string;
    title: string;
    done: boolean;
  } | null;
  subtasks: { id: string; title: string; done: boolean }[];
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

export const CalendarWeekView = ({ weekStartIsoDate, events }: Props) => {
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<UiEvent | null>(null);
  const [taskTitleDraft, setTaskTitleDraft] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [eventTaskData, setEventTaskData] = useState<EventTaskData | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<UiEvent[]>([]);

  useEffect(() => {
    setCalendarEvents(
      events.map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      })),
    );
  }, [events]);

  const patchEvent = (eventId: string, updates: Partial<Pick<UiEvent, "done" | "taskTitle">>) => {
    setCalendarEvents((current) =>
      current.map((event) => (event.id === eventId ? { ...event, ...updates } : event)),
    );

    setSelectedEvent((current) =>
      current && current.id === eventId ? { ...current, ...updates } : current,
    );
  };

  const fetchEventTaskData = async (event: UiEvent) => {
    const query = new URLSearchParams({
      classId: event.classId,
      occurrenceDate: event.occurrenceDate,
    });

    const response = await fetch(`/api/tasks/event?${query.toString()}`);
    const json = (await response.json()) as {
      ok: boolean;
      message?: string;
      task?: EventTaskData["task"];
      subtasks?: EventTaskData["subtasks"];
    };

    if (!json.ok) {
      throw new Error(json.message ?? "Failed to load event task data.");
    }

    setEventTaskData({
      task: json.task ?? null,
      subtasks: json.subtasks ?? [],
    });

    patchEvent(event.id, {
      done: Boolean(json.task?.done),
      taskTitle: json.task?.title ?? event.taskTitle,
    });

    setTaskTitleDraft(json.task?.title ?? event.taskTitle ?? "Class task");
  };

  useEffect(() => {
    if (!selectedEvent) {
      setEventTaskData(null);
      return;
    }

    void fetchEventTaskData(selectedEvent);
  }, [selectedEvent]);

  const saveTask = async (payload: {
    classId: string;
    occurrenceDate: string;
    done?: boolean;
    title?: string;
  }) => {
    const response = await fetch("/api/tasks/upsert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await response.json()) as { ok: boolean; message?: string };
    if (!json.ok) {
      throw new Error(json.message ?? "Failed to update task.");
    }
  };

  const saveTaskTitle = async () => {
    if (!selectedEvent || !taskTitleDraft.trim()) {
      return;
    }

    try {
      setPendingEventId(selectedEvent.id);
      await saveTask({
        classId: selectedEvent.classId,
        occurrenceDate: selectedEvent.occurrenceDate,
        title: taskTitleDraft.trim(),
      });
      await fetchEventTaskData(selectedEvent);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to save task title.");
    } finally {
      setPendingEventId(null);
    }
  };

  const toggleSubtask = async (subtaskId: string, done: boolean) => {
    if (!selectedEvent) {
      return;
    }

    try {
      setPendingEventId(selectedEvent.id);
      const response = await fetch("/api/tasks/subtasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subtaskId, done }),
      });

      const json = (await response.json()) as { ok: boolean; message?: string };
      if (!json.ok) {
        throw new Error(json.message ?? "Failed to update subtask.");
      }

      await fetchEventTaskData(selectedEvent);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to update subtask.");
    } finally {
      setPendingEventId(null);
    }
  };

  const addSubtask = async () => {
    if (!selectedEvent || !newSubtask.trim()) {
      return;
    }

    try {
      setPendingEventId(selectedEvent.id);
      const response = await fetch("/api/tasks/subtasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          classId: selectedEvent.classId,
          occurrenceDate: selectedEvent.occurrenceDate,
          title: newSubtask.trim(),
        }),
      });

      const json = (await response.json()) as { ok: boolean; message?: string };
      if (!json.ok) {
        throw new Error(json.message ?? "Failed to create subtask.");
      }

      setNewSubtask("");
      await fetchEventTaskData(selectedEvent);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to create subtask.");
    } finally {
      setPendingEventId(null);
    }
  };

  const markEventDone = async () => {
    if (!selectedEvent) {
      return;
    }

    try {
      setPendingEventId(selectedEvent.id);
      await saveTask({
        classId: selectedEvent.classId,
        occurrenceDate: selectedEvent.occurrenceDate,
        done: true,
      });
      patchEvent(selectedEvent.id, { done: true });
      await fetchEventTaskData(selectedEvent);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to mark class done.");
    } finally {
      setPendingEventId(null);
    }
  };

  const allSubtasksDone =
    eventTaskData !== null &&
    ((eventTaskData.subtasks.length === 0) || eventTaskData.subtasks.every((subtask) => subtask.done));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-2">
        <div className="schedulio-rbc overflow-hidden rounded-lg border border-border bg-card p-2">
          <Calendar
            localizer={localizer}
            culture="en-US"
            date={new Date(`${weekStartIsoDate}T00:00:00`)}
            events={calendarEvents}
            view="week"
            toolbar={false}
            popup
            selectable={false}
            step={30}
            timeslots={2}
            min={new Date(1970, 0, 1, 7, 0, 0)}
            max={new Date(1970, 0, 1, 21, 0, 0)}
            style={{ height: 720 }}
            onSelectEvent={(event) => setSelectedEvent(event as UiEvent)}
            eventPropGetter={(event: UiEvent) => {
              const base = event.skipped
                ? "schedulio-event schedulio-event-skipped"
                : event.done
                  ? "schedulio-event schedulio-event-done"
                  : event.kind === "lecture"
                    ? "schedulio-event schedulio-event-lecture"
                    : event.kind === "lab"
                      ? "schedulio-event schedulio-event-lab"
                      : "schedulio-event schedulio-event-other";

              return {
                className: `${base} ${pendingEventId === event.id ? "opacity-60" : ""}`,
              };
            }}
            formats={{
              timeGutterFormat: "HH:mm",
              dayFormat: "EEE",
              dayHeaderFormat: "EEE d/M",
            }}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        {!selectedEvent ? (
          <p className="text-sm text-muted-foreground">
            Select a class in the calendar to manage tasks.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">{selectedEvent.title}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">{selectedEvent.kind}</Badge>
                <Badge variant="secondary">{selectedEvent.occurrenceDate}</Badge>
                {selectedEvent.location ? <Badge>{selectedEvent.location}</Badge> : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-title">Task title</Label>
              <div className="flex gap-2">
                <Input
                  id="task-title"
                  value={taskTitleDraft}
                  onChange={(event) => setTaskTitleDraft(event.target.value)}
                />
                <Button onClick={saveTaskTitle} disabled={!taskTitleDraft.trim() || pendingEventId === selectedEvent.id}>
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subtasks</Label>
              <div className="space-y-2">
                {(eventTaskData?.subtasks ?? []).map((subtask) => (
                  <label key={subtask.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={subtask.done}
                      onCheckedChange={(checked) =>
                        void toggleSubtask(subtask.id, Boolean(checked))
                      }
                    />
                    <span>{subtask.title}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add subtask"
                  value={newSubtask}
                  onChange={(event) => setNewSubtask(event.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={addSubtask}
                  disabled={!newSubtask.trim() || pendingEventId === selectedEvent.id}
                >
                  Add
                </Button>
              </div>
            </div>

            {allSubtasksDone ? (
              <Button onClick={markEventDone} className="w-full" disabled={pendingEventId === selectedEvent.id}>
                Mark entire class as done
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                You can mark this class done immediately if there are no subtasks, or after all subtasks are checked.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

