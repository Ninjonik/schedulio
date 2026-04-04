import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/appwrite";

export const requireUser = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
};

