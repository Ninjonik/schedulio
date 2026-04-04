import {
  addClassAction,
  addSkipAction,
  importCuniScheduleAction,
  updateClassKindAction,
} from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth";
import { listClasses } from "@/lib/data";

const weekdays = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export default async function ClassesPage() {
  const user = await requireUser();
  const classes = await listClasses(user.$id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Classes</h1>
        <p className="text-sm text-muted-foreground">
          Keep your weekly timetable simple. Add a class once, then manage skips by date.
        </p>
      </header>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Import from XML</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={importCuniScheduleAction} className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input name="xmlFile" type="file" accept=".xml,text/xml,application/xml" required />
            <Button type="submit">Import CUNI schedule</Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Export your timetable as xCal XML, then upload it here.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Add class</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addClassAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Class title</Label>
              <Input id="title" name="title" placeholder="Operating Systems" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" placeholder="CS301" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekday">Weekday (1-7)</Label>
                <Input id="weekday" name="weekday" type="number" min={1} max={7} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="classKind">Class type</Label>
              <select
                id="classKind"
                name="classKind"
                defaultValue="other"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="lecture">Lecture</option>
                <option value="lab">Lab</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start time</Label>
                <Input id="startTime" name="startTime" type="time" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End time</Label>
                <Input id="endTime" name="endTime" type="time" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekPattern">Week pattern</Label>
              <select
                id="weekPattern"
                name="weekPattern"
                defaultValue="all"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="all">All weeks</option>
                <option value="odd">Odd weeks</option>
                <option value="even">Even weeks</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="B2-204" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL (optional)</Label>
              <Input id="imageUrl" name="imageUrl" type="url" placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input id="color" name="color" placeholder="#1d4ed8" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descriptionMd">Description (Markdown)</Label>
              <Textarea
                id="descriptionMd"
                name="descriptionMd"
                rows={5}
                placeholder="Syllabus notes, links, agenda..."
              />
            </div>

            <Button type="submit" className="w-full">
              Save class
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Current schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No classes yet. Add your first class on the left.
            </p>
          ) : null}

          {classes.map((classRow) => (
            <div
              key={classRow.$id}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{classRow.title}</h3>
                {classRow.code ? <Badge variant="secondary">{classRow.code}</Badge> : null}
                {classRow.classKind ? <Badge variant="outline">{classRow.classKind}</Badge> : null}
                <Badge>{classRow.weekPattern}</Badge>
              </div>
              <form action={updateClassKindAction} className="mt-3 flex items-center gap-2">
                <input type="hidden" name="classId" value={classRow.$id} />
                <select
                  name="classKind"
                  defaultValue={classRow.classKind ?? "other"}
                  className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value="lecture">Lecture</option>
                  <option value="lab">Lab</option>
                  <option value="other">Other</option>
                </select>
                <Button type="submit" variant="outline" size="sm">
                  Update type
                </Button>
              </form>
              <p className="mt-1 text-sm text-muted-foreground">
                {weekdays.find((day) => day.value === classRow.weekday)?.label} · {classRow.startTime} - {classRow.endTime}
                {classRow.location ? ` · ${classRow.location}` : ""}
              </p>

              <form action={addSkipAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="classId" value={classRow.$id} />
                <Input name="date" type="date" required />
                <Input name="reason" placeholder="Holiday / cancelled" />
                <Button type="submit" variant="outline">
                  Add skip
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}


