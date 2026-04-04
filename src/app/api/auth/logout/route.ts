import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionClient, SESSION_COOKIE } from "@/lib/appwrite";

export const POST = async () => {
  const store = await cookies();
  const secret = store.get(SESSION_COOKIE)?.value;

  if (secret) {
    try {
      const { account } = createSessionClient(secret);
      await account.deleteSession({ sessionId: "current" });
    } catch {
      // Ignore invalid sessions and continue cookie cleanup.
    }
  }

  store.delete(SESSION_COOKIE);

  return NextResponse.json({ ok: true });
};
