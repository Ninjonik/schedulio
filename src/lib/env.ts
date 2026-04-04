import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.string().url(),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: z.string().min(1),
  APPWRITE_API_KEY: z.string().min(1),
  APPWRITE_DATABASE_ID: z.string().default("schedulio_db"),
  APPWRITE_CLASSES_TABLE_ID: z.string().default("classes"),
  APPWRITE_SKIPS_TABLE_ID: z.string().default("class_skips"),
  APPWRITE_TASKS_TABLE_ID: z.string().default("tasks"),
  APPWRITE_SUBTASKS_TABLE_ID: z.string().default("subtasks"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const messages = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid env configuration: ${messages}`);
}

export const env = parsed.data;

