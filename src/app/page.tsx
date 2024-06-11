import Link from "next/link";

import { getServerAuthSession } from "~/server/auth";
import { buttonVariants } from "~/app/_components/ui/button";
import { MoveUpRightIcon } from "lucide-react";
import { SignOutButton } from "./_components/signout-button";
import { api } from "~/trpc/server";

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
              {session ? (
                <SignOutButton />
              ) : (
                <Link
                  href="/api/auth/signin"
                  className={buttonVariants({ variant: "default" })}
                >
                  Sign in
                </Link>
              )}
              {session && (
                <Link
                  href="/instances"
                  className={buttonVariants({ variant: "link" })}
                >
                  New Instance
                  <MoveUpRightIcon className="ml-2 h-4 w-4" />
                </Link>
              )}
            </div>
            {session && <RecentJobLinks />}
          </div>
        </div>
      </div>
    </main>
  );
}

async function RecentJobLinks() {
  const recentJobs = await api.job.userRecentJobs();

  return (
    <div className="flex flex-col items-center gap-4 mt-12 ">
      <h2 className="text-xl font-semibold">Recent Jobs</h2>
      <ul className="flex flex-col gap-2">
        {recentJobs.jobs.map(({jobId, state}) => (
          <li key={jobId}>
            <Link
              href={`/instances?jobId=${jobId}`}
              className={buttonVariants({ variant: "link" })}
            >
              {`${jobId} (${state?.split(" ")[0] ?? state})`}
              <MoveUpRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
