import Link from "next/link";

import { getServerAuthSession } from "~/server/auth";
import { buttonVariants } from "~/components/ui/button";
import {MoveUpRightIcon} from 'lucide-react';

export default async function Home() {
  const session = await getServerAuthSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-[5rem]">
          Launch <span className="text-[hsl(280,100%,70%)]">3D</span>
        </h1>
        <p className="text-center text-2xl text-slate-400">
          Launcher for Annotat3D instances.
        </p>
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-center text-2xl ">
              {session && <span>Logged in as {session.user?.name}</span>}
            </p>
            <div className="flex gap-4">
              <Link
                href={session ? "/api/auth/signout" : "/api/auth/signin"}
                className={buttonVariants({variant:"default"})}
              >
                {session ? "Sign out" : "Sign in"}
              </Link>
              {session && (
                <Link
                  href="/example"
                  className={buttonVariants({variant:"link"})}
                >
                  Secret Page
                  <MoveUpRightIcon className="w-4 h-4 ml-2" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
