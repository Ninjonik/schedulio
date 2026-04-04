import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, SESSION_COOKIE } from "@/lib/appwrite";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const POST = async (request: Request) => {
  try {
    const body = schema.parse(await request.json());
    const { account } = createAdminClient();

    const session = await account.createEmailPasswordSession({
      email: body.email,
      password: body.password,
    });

    if (!session.secret) {
      throw new Error("Missing session secret from Appwrite login response.");
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, session.secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(session.expire),
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Login failed",
      },
      { status: 400 },
    );
  }
};


