"use client";
import { MoveUpRightIcon } from "lucide-react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { buttonVariants } from "./ui/button";
import { useKeysError } from "../_hooks/use-keys-error";

export function RecentJobs() {
  const { data, error, isError, isLoading } = api.job.userRecentJobs.useQuery();

  useKeysError({ isError, error });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-500 p-4">
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  if (data?.jobs.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 flex flex-col items-center gap-4 ">
      <h2 className="text-xl font-semibold">Recent Jobs</h2>
      <ul className="flex flex-col gap-2">
        {data?.jobs.map(({ jobId, state }) => (
          <li key={jobId}>
            <Link
              href={`/instances?jobId=${jobId}`}
              className={buttonVariants({ variant: "link" })}
            >
              {`${jobId} (${state})`}
              <MoveUpRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
