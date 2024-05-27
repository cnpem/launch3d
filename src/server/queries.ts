"use server";
import "server-only";
import { db } from "~/server/db";

export async function getUserFromEmail(email: string) {
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });
  return user;
}
