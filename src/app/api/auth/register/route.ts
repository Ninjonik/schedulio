import { NextResponse } from "next/server";
import { z } from "zod";
import { ID } from "node-appwrite";
import { createAdminClient, SESSION_COOKIE } from "@/lib/appwrite";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export const POST = async (request: Request) => {
  try {
    const body = schema.parse(await request.json());
    const { account } = createAdminClient();

    await account.create({
      userId: ID.unique(),
      name: body.name,
      email: body.email,
      password: body.password,
    });

    const session = await account.createEmailPasswordSession({
      email: body.email,
      password: body.password,
    });

    if (!session.secret) {
      throw new Error("Missing session secret from Appwrite registration response.");
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
        message: error instanceof Error ? error.message : "Registration failed",
      },
      { status: 400 },
    );
  }
};


