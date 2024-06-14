"use client";
import { useCallback } from "react";
import { useQueryState } from "nuqs";

import Link from "next/link";
import { notFound } from "next/navigation";
import { toast } from "sonner";

import {
  CheckIcon,
  EllipsisIcon,
  MoveLeftIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { api } from "~/trpc/react";

import { cn } from "~/lib/utils";
import { jobName } from "~/lib/constants";

import NewInstanceForm from "./new";
import Logs from "./logs";

import { Button } from "~/app/_components/ui/button";
import { buttonVariants } from "~/app/_components/ui/button";
import { useKeysError } from "../_hooks/use-keys-error";

export default function View() {
  const [jobId, setJobId] = useQueryState("jobId", { defaultValue: "" });

  const onJobIdChange = useCallback(
    async (jobId: string | undefined) => {
      await setJobId(jobId ?? "");
    },
    [setJobId],
  );

  if (!jobId) {
    return <NewInstanceForm setJobId={onJobIdChange} />;
  }

  return <InstanceView jobId={jobId} setJobId={onJobIdChange} />;
}

function getAnnotat3dWebUrl(rawTxt: string | undefined) {
  if (!rawTxt || rawTxt === "") {
    return undefined;
  }
  const urlKey = "Access Annotat3D-web instance in";
  const url = rawTxt.match(new RegExp(`${urlKey}(.*)`))?.[1]?.trim();
  if (!url || url === "") {
    return undefined;
  }
  return url;
}

function InstanceView({
  jobId,
  setJobId,
}: {
  jobId: string;
  setJobId: (jobId: string | undefined) => void;
}) {
  const utils = api.useUtils();
  const report = api.job.report.useQuery(
    { jobId },
    {
      enabled: !!jobId,
    },
  );

  useKeysError({ isError: report.isError, error: report.error });

  const cancel = api.job.cancel.useMutation({
    onSuccess: async () => {
      await utils.job.report.invalidate({ jobId });
    },
  });

  const stdout = api.ssh.head.useQuery(
    {
      path: `~/${jobName}-${jobId}.out`,
      lines: 25,
    },
    {
      enabled: !!jobId && report.data?.state === "RUNNING",
    },
  );

  const clear = api.ssh.rm.useMutation({
    onSuccess: async () => {
      setJobId(undefined);
      toast.dismiss();
      toast.success("Log files cleared");
    },
    onError: async (error) => {
      setJobId(undefined);
      toast.dismiss();
      toast.error(error.message);
    },
  });

  const url = getAnnotat3dWebUrl(stdout.data);

  if (report.isError) {
    if (report.error?.data?.code === "NOT_FOUND") {
      notFound();
    }
    return <div>Error: {report.error.message}</div>;
  }

  return (
    <div className="my-auto flex h-full w-2/3 flex-row space-x-4">
      <div className="absolute right-0 top-0 m-4">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "link" }),
            "fixed left-2 top-4",
          )}
        >
          <MoveLeftIcon className="mr-2 h-4 w-4" />
          Home
        </Link>
      </div>
      <div className="w-1/3">
        <div className="mb-3 flex w-full flex-row items-center">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Annotat<span className="text-[hsl(280,100%,70%)]">3D</span>
          </h1>
        </div>
        <div className="mt-10">
          <ol className="relative border-s border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <li className="mb-10 ms-6">
              <ErrorSuccessOrDefaultIcon
                errorCondition={false}
                successCondition={!!report.data?.submit}
              />
              <h3 className="font-medium leading-tight">Submit</h3>
              <div className="text-sm">
                <p>Submit time: {report.data?.submit}</p>
                <p>Partition: {report.data?.partition}</p>
                <p>AllocGRES: {report.data?.allocGRES}</p>
                <p>AllocCPUS: {report.data?.nCPUS}</p>
                <p>Node: {report.data?.nodeList}</p>
              </div>
            </li>
            <li className="mb-10 ms-6">
              <ErrorSuccessOrDefaultIcon
                errorCondition={
                  report.data?.state === "ERROR" ||
                  report.data?.elapsed === "00:00:00"
                }
                successCondition={
                  report.data?.state === "COMPLETED" ||
                  report.data?.state === "CANCELLED"
                }
              />
              <h3 className="font-medium leading-tight">Running</h3>
              <div className="text-sm">
                <p>Start Time: {report.data?.start}</p>
                <p>Elapsed: {report.data?.elapsed}</p>
                <p>Link: {url}</p>
              </div>
            </li>
            <li className="mb-10 ms-6">
              <ErrorSuccessOrDefaultIcon
                errorCondition={report.data?.state === "ERROR"}
                successCondition={
                  report.data?.state === "COMPLETED" ||
                  report.data?.state === "CANCELLED"
                }
              />
              <h3 className="font-medium leading-tight">Stop</h3>
              <div className="text-sm">
                <p>State: {report.data?.reason}</p>
              </div>
            </li>
          </ol>
        </div>
        {url && (
          <p>
            Access the Annotat3D-web instance in{" "}
            <Link
              href={url}
              className="text-blue-500"
              rel="noreferrer noopener"
              target="_blank"
            >
              {url}
            </Link>
          </p>
        )}
        <div className="my-2 flex flex-row gap-2">
          <div>
            <Button
              variant={"destructive"}
              onClick={() => {
                if (
                  report.data?.state === "RUNNING" ||
                  report.data?.state === "PENDING"
                ) {
                  cancel.mutate({ jobId });
                } else {
                  toast(
                    <div className="flex flex-col gap-2">
                      <p className="font-bold">Delete log files?</p>
                      <div className="flex flex-row gap-1">
                        <p>
                          Do you also want to delete the log files from the
                          remote server?
                        </p>
                        <Button
                          variant={"destructive"}
                          size={"sm"}
                          onClick={() =>
                            clear.mutate({
                              path: `~/${jobName}-${jobId}.out ~/${jobName}-${jobId}.err`,
                            })
                          }
                        >
                          Yes
                        </Button>
                        <Button
                          variant={"secondary"}
                          size={"sm"}
                          onClick={() => {
                            setJobId(undefined);
                            toast.dismiss();
                          }}
                        >
                          No
                        </Button>
                      </div>
                    </div>,
                  );
                }
              }}
            >
              {report.data?.state === "RUNNING" ||
              report.data?.state === "PENDING"
                ? "Stop instance"
                : "Clear dashboard"}
            </Button>
          </div>
        </div>
      </div>
      <div className="w-2/3">
        <Logs jobId={jobId} />
      </div>
    </div>
  );
}

function CompleteIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute -start-4 flex h-8 w-8 items-center justify-center rounded-full bg-green-200 ring-4 ring-white dark:bg-green-900 dark:ring-gray-900",
        className,
      )}
    >
      <CheckIcon className="h-4 w-4 text-green-500 dark:text-green-400" />
    </span>
  );
}

function WaitingIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute -start-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 ring-4 ring-white dark:bg-gray-700 dark:ring-gray-900",
        className,
      )}
    >
      <EllipsisIcon className="h-4 w-4 animate-pulse text-gray-500 dark:text-gray-400" />
    </span>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute -start-4 flex h-8 w-8 items-center justify-center rounded-full bg-red-200 ring-4 ring-white dark:bg-red-900 dark:ring-gray-900",
        className,
      )}
    >
      <TriangleAlertIcon className="h-4 w-4 text-red-500 dark:text-red-400" />
    </span>
  );
}

function ErrorSuccessOrDefaultIcon({
  errorCondition,
  successCondition,
}: {
  errorCondition: boolean;
  successCondition: boolean;
}) {
  if (errorCondition) {
    return <ErrorIcon />;
  } else if (successCondition) {
    return <CompleteIcon />;
  } else {
    return <WaitingIcon />;
  }
}
