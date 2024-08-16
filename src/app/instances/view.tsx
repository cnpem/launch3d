"use client";
import { useCallback } from "react";
import { useQueryState } from "nuqs";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
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

  return <InstanceView jobId={jobId} />;
}

function InstanceView({ jobId }: { jobId: string }) {
  const report = api.job.report.useQuery(
    { jobId },
    {
      refetchInterval: (q) =>
        q.state.data?.state === "PENDING" || q.state.data?.state === "RUNNING"
          ? 1000 * 60 * 2
          : false,
    },
  );

  const urlQuery = api.ssh.headGrep.useQuery(
    {
      path: `~/${jobName}-${jobId}.out`,
      grep: `-Eo 'http://${report.data?.nodeList}.lnls.br:([0-9]+)'`,
    },
    {
      enabled: !!report.data && report.data.state === "RUNNING",
    },
  );

  useKeysError({ isError: report.isError, error: report.error });

  if (report.isError) {
    if (report.error?.data?.code === "NOT_FOUND") {
      notFound();
    }
    return <div>Error: {report.error?.message}</div>;
  }

  if (urlQuery.isError) {
    console.error("urlQuery FAILED:", urlQuery.error);
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
              if (
                !urlQuery.data ||
                urlQuery.isError ||
                urlQuery.isPending ||
                report.data?.state !== "RUNNING"
              ) {
                e.preventDefault();
              }
            }}
            href={urlQuery.data ?? {}}
            className={cn(
              buttonVariants({ variant: "link" }),
              `${urlQuery.isLoading && "cursor-wait"}`,
              `${(urlQuery.isError || urlQuery.isPending || report.data?.state !== "RUNNING") && "cursor-not-allowed"}`,
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
                  isError={
                    urlQuery.isError ||
                    urlQuery.isPending ||
                    report.data?.state !== "RUNNING"
                  }
                />
              </span>
            </h1>
          </Link>
          <RenderStatusMessage
            isDisabled={urlQuery.isPending || report.data?.state !== "RUNNING"}
            isError={urlQuery.isError}
            isLoading={urlQuery.isLoading}
            url={urlQuery.data}
          />
        </div>
        <div className="my-4 pl-4" id="steps">
          <ol className="relative border-s border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <li className="mb-10 ms-6">
              <StatusMarker status={report.data?.steps.submit} />
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
              <StatusMarker status={report.data?.steps.start} />
              <h3 className="font-medium leading-tight">Running</h3>
              <div className="text-sm">
                <p>Start Time: {report.data?.start}</p>
                <p>Elapsed: {report.data?.elapsed}</p>
              </div>
            </li>
            <li className="ms-6">
              <StatusMarker status={report.data?.steps.finish} />
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
        {report.data?.state === "RUNNING" ||
        report.data?.state === "PENDING" ? (
          <CancelButton jobId={jobId} jobName={jobName} />
        ) : (
          <ClearDashboardButton jobId={jobId} jobName={jobName} />
        )}
      </div>
      <div className="w-3/4">
        <Logs jobId={jobId} />
      </div>
    </div>
  );
}

function CancelButton({ jobId, jobName }: { jobId: string; jobName: string }) {
  const utils = api.useUtils();
  const cancel = api.job.cancel.useMutation({
    onSuccess: async () => {
      await utils.job.report.invalidate({ jobId });
      await utils.ssh.headGrep.invalidate({
        path: `~/${jobName}-${jobId}.out`,
      });
    },
    onError: async (error) => {
      toast.error(error.message);
    },
  });
  return (
    <Button
      className="w-full"
      variant={"destructive"}
      disabled={cancel.isPending}
      onClick={() => cancel.mutate({ jobId })}
    >
      {cancel.isPending ? "Cancelling instance..." : "Stop instance"}
    </Button>
  );
}

function ClearDashboardButton({
  jobId,
  jobName,
}: {
  jobId: string;
  jobName: string;
}) {
  const router = useRouter();
  const clear = api.ssh.rm.useMutation({
    onSuccess: async () => {
      toast.dismiss();
      toast.success("Log files cleared");
      router.push("/");
    },
    onError: async (error) => {
      toast.dismiss();
      toast.error("Error removing log files: " + error.message);
    },
    onMutate: async () => {
      toast.info("Removing remote files...");
    },
  });
  return (
    <Button
      className="w-full"
      variant={"destructive"}
      onClick={() =>
        toast(
          <div className="flex flex-col gap-2">
            <p className="font-bold">Delete log files?</p>
            <div className="flex flex-row gap-1">
              <p>
                Do you also want to delete the log files from the remote server?
              </p>
              <Button
                variant={"destructive"}
                size={"sm"}
                disabled={clear.isPending}
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
                disabled={clear.isPending}
                onClick={() => {
                  router.push("/");
                  toast.dismiss();
                }}
              >
                No
              </Button>
            </div>
          </div>,
        )
      }
    >
      {clear.isPending ? "Removing remote files..." : "Clear dashboard"}
    </Button>
  );
}

function SuccessMarker({ className }: { className?: string }) {
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

function WaitingMarker({ className }: { className?: string }) {
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

function ErrorMarker({ className }: { className?: string }) {
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

function StatusMarker({ status }: { status: StepStatus | undefined }) {
  switch (status) {
    case "success":
      return <SuccessMarker />;
    case "error":
      return <ErrorMarker />;
    default:
      return <WaitingMarker />;
  }
}

function UrlIcon({
  isLoading,
  isError,
}: {
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <EllipsisIcon className="mx-1 h-4 animate-pulse text-gray-500 dark:text-gray-400" />
    );
  }
  if (isError) {
    return (
      <TriangleAlertIcon className="mx-1 h-4 text-red-500 dark:text-red-400" />
    );
  }
  return <ExternalLinkIcon className="mx-1 h-4" />;
}

function RenderStatusMessage({
  isDisabled,
  isLoading,
  isError,
  url,
}: {
  isDisabled: boolean;
  isLoading: boolean;
  isError: boolean;
  url: string | undefined;
}) {
  if (isDisabled)
    return <p className="text-wrap text-slate-400">Instance is not running.</p>;
  if (isLoading)
    return <p className="text-wrap text-slate-400">Loading instance url...</p>;
  if (isError)
    return (
      <p className="text-wrap text-slate-400">Error loading instance url.</p>
    );

  return (
    <div className="flex flex-col gap-1">
      <p className="text-wrap text-slate-400">Instance running in:</p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="text-blue-500 dark:text-blue-400"
      >
        {url}
      </a>
    </div>
  );
}
