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
  ExternalLinkIcon,
} from "lucide-react";

import { api } from "~/trpc/react";

import { cn } from "~/lib/utils";

import NewInstanceForm from "./new";
import Logs from "./logs";

import { Button } from "~/app/_components/ui/button";
import { buttonVariants } from "~/app/_components/ui/button";
import { useKeysError } from "../_hooks/use-keys-error";
import { jobName } from "~/lib/constants";
import { type StepStatus } from "~/lib/types";

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

function InstanceView({
  jobId,
  setJobId,
}: {
  jobId: string;
  setJobId: (jobId: string | undefined) => void;
}) {
  const utils = api.useUtils();

  const report = api.job.report.useQuery({ jobId });

  const urlQuery = api.ssh.headGrep.useQuery(
    {
      path: `~/${jobName}-${jobId}.out`,
      grep: "Access Annotat3D-web instance in",
    },
    {
      enabled: !!report.data && report.data.state === "RUNNING",
    },
  );

  function parseUrl(rawTxt: string | undefined) {
    if (!rawTxt) {
      return undefined;
    }
    const urlKey = "Access Annotat3D-web instance in";
    const url = rawTxt.match(new RegExp(`${urlKey}(.*)`))?.[1]?.trim();
    if (!url || url === "") {
      return undefined;
    }
    return url;
  }

  const cancel = api.job.cancel.useMutation({
    onSuccess: async () => {
      await utils.job.report.invalidate({ jobId });
      await utils.ssh.headGrep.invalidate({
        path: `~/${jobName}-${jobId}.out`,
      });
    },
  });

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

  useKeysError({ isError: report.isError, error: report.error });

  if (report.isError) {
    if (report.error?.data?.code === "NOT_FOUND") {
      notFound();
    }
    return <div>Error: {report.error?.message}</div>;
  }

  if (report.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="my-auto flex h-full w-3/4 flex-row space-x-4">
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
      <div className="w-1/4">
        <div className="flex w-full flex-col items-start gap-2">
          <Link
            onClick={(e) => {
              if (!parseUrl(urlQuery.data)) {
                e.preventDefault();
              }
            }}
            href={parseUrl(urlQuery.data) ?? {}}
            className={cn(
              buttonVariants({ variant: "link" }),
              `${urlQuery.isLoading && "cursor-wait"}`,
              `${urlQuery.isError && "cursor-not-allowed"}`,
              `${!urlQuery.isError && !urlQuery.isLoading && !parseUrl(urlQuery.data) && "cursor-not-allowed"}`,
              "px-0",
            )}
            rel="noreferrer noopener"
            target="_blank"
          >
            <h1 className="flex flex-row text-3xl font-extrabold tracking-tight">
              Annotat<span className="text-[hsl(280,100%,70%)]">3D</span>
              <span>
                <UrlIcon
                  isLoading={urlQuery.isLoading}
                  isError={urlQuery.isError}
                  isUrl={!!parseUrl(urlQuery.data)}
                />
              </span>
            </h1>
          </Link>
          {urlQuery.isLoading && (
            <p className="text-wrap text-slate-400">Loading instance url...</p>
          )}
          {urlQuery.isError && (
            <p className="text-wrap text-slate-400">{`Error loading instance url: ${urlQuery.error?.message}`}</p>
          )}
          {!urlQuery.isError &&
            !urlQuery.isLoading &&
            !parseUrl(urlQuery.data) && (
              <p className="text-wrap text-slate-400">
                {"Error parsing instance url from log file."}
              </p>
            )}
          {parseUrl(urlQuery.data) && (
            <p className="text-wrap text-slate-400">
              Access your instance of Annotat3D in:
              <a
                href={parseUrl(urlQuery.data)}
                target="_blank"
                rel="noreferrer noopener"
                className="ml-1 text-blue-500 dark:text-blue-400"
              >
                {parseUrl(urlQuery.data)}
              </a>
            </p>
          )}
        </div>
        <div className="my-2">
          <ol className="relative border-s border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <li className="mb-10 ms-6">
              <StatusIcon status={report.data?.steps.submit} />
              <h3 className="font-medium leading-tight">Submit</h3>
              <div className="text-sm">
                {report.data?.steps.submit !== "success" && (
                  <p className="text-red-500 dark:text-red-400">
                    Job Status: {report.data?.state}
                  </p>
                )}
                <p>Submit time: {report.data?.submit}</p>
                <p>Partition: {report.data?.partition}</p>
                <p>AllocGRES: {report.data?.allocGRES}</p>
                <p>AllocCPUS: {report.data?.nCPUS}</p>
                <p>Node: {report.data?.nodeList}</p>
              </div>
            </li>
            <li className="mb-10 ms-6">
              <StatusIcon status={report.data?.steps.start} />
              <h3 className="font-medium leading-tight">Running</h3>
              <div className="text-sm">
                <p>Start Time: {report.data?.start}</p>
                <p>Elapsed: {report.data?.elapsed}</p>
              </div>
            </li>
            <li className="mb-10 ms-6">
              <StatusIcon status={report.data?.steps.finish} />
              <h3 className="font-medium leading-tight">Stop</h3>
              <div className="text-sm">
                <p>State: {report.data?.state}</p>
                <p>End Time: {report.data?.end}</p>
                <p>Exit Code: {report.data?.exitCode}</p>
                <p>Reason: {report.data?.reason}</p>
              </div>
            </li>
          </ol>
        </div>
        <Button
          className="w-full"
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
                      Do you also want to delete the log files from the remote
                      server?
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
          {report.data?.state === "RUNNING" || report.data?.state === "PENDING"
            ? "Stop instance"
            : "Clear dashboard"}
        </Button>
      </div>
      <div className="w-3/4">
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

function StatusIcon({ status }: { status: StepStatus | undefined }) {
  switch (status) {
    case "success":
      return <CompleteIcon />;
    case "error":
      return <ErrorIcon />;
    default:
      return <WaitingIcon />;
  }
}

function UrlIcon({
  isLoading,
  isError,
  isUrl,
}: {
  isLoading: boolean;
  isError: boolean;
  isUrl: boolean;
}) {
  if (isLoading) {
    return (
      <EllipsisIcon className="mx-1 h-4 animate-pulse text-gray-500 dark:text-gray-400" />
    );
  }
  if (isUrl) {
    return <ExternalLinkIcon className="mx-1 h-4" />;
  }
  if (isError) {
    console.error("URL ERROR");
  }
  return (
    <TriangleAlertIcon className="mx-1 h-4 text-red-500 dark:text-red-400" />
  );
}
