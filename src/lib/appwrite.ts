import "server-only";

import { cookies } from "next/headers";
import { Account, Client, ID, Permission, Query, Role, TablesDB } from "node-appwrite";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "schedulio_session";
const INVALID_SESSION_TTL_MS = 5 * 60 * 1000;
const invalidSessionCache = new Map<string, number>();

const createBaseClient = () =>
  new Client()
    .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

export const createAdminClient = () => {
  const client = createBaseClient().setKey(env.APPWRITE_API_KEY);

  return {
    client,
    tablesDB: new TablesDB(client),
    account: new Account(client),
  };
};

export const createSessionClient = (sessionSecret: string) => {
  const client = createBaseClient().setSession(sessionSecret);

  return {
    client,
    tablesDB: new TablesDB(client),
    account: new Account(client),
  };
};

export const getCurrentUser = async () => {
  const store = await cookies();
  const secret = store.get(SESSION_COOKIE)?.value;

  if (!secret) {
    return null;
  }

  const invalidUntil = invalidSessionCache.get(secret);
  if (invalidUntil && invalidUntil > Date.now()) {
    return null;
  }

  if (invalidUntil && invalidUntil <= Date.now()) {
    invalidSessionCache.delete(secret);
  }

  try {
    const { account } = createSessionClient(secret);
    const user = await account.get();
    invalidSessionCache.delete(secret);
    return user;
  } catch {
    invalidSessionCache.set(secret, Date.now() + INVALID_SESSION_TTL_MS);
    return null;
  }
};

export { ID, Permission, Query, Role };

