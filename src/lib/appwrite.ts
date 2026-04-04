import "server-only";

import { cookies } from "next/headers";
import { Account, Client, ID, Query, TablesDB } from "node-appwrite";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "schedulio_session";

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

  try {
    const { account } = createSessionClient(secret);
    return await account.get();
  } catch {
    return null;
  }
};

export { ID, Query };

