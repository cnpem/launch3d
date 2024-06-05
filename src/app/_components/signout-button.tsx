"use client";
import { signOut } from "next-auth/react";
import { Button } from "~/app/_components/ui/button";

export function SignOutButton() {
  return <Button onClick={() => signOut()}>Sign out</Button>;
}
