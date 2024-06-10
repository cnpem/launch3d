"use client";
import { useCallback } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useQueryState } from "nuqs";
import NewInstanceForm from "./new";
import Logs from "./logs";
import { Button } from "~/app/_components/ui/button";

import { cn } from "~/lib/utils";
import { buttonVariants } from "~/app/_components/ui/button";
import { jobName } from "~/lib/constants";
import { MoveLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { toast } from "sonner";

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
      refetchOnMount: true,
    },
  );

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
      setJobId(undefined)
      toast.dismiss();
      toast.success("Log files cleared"); 
    },
    onError: async (error) => {
      setJobId(undefined)
      toast.dismiss();
      toast.error(error.message);
    }
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
        <p>Job ID: {jobId}</p>
        <p>Job status: {report.data?.state}</p>
        {report.data && (
          <>
            <p className="font-semibold">Report</p>

            <p>State: {report.data.state}</p>
            <p>Partition: {report.data.partition}</p>
            <p>AllocGRES: {report.data.allocGRES}</p>
            <p>AllocCPUS: {report.data.allocCPUS}</p>
            <p>Node: {report.data.nodeList}</p>
            <p>Start time: {report.data.start}</p>
            <p>Elapsed time: {report.data.elapsed}</p>
          </>
        )}
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
        <div className="flex flex-row gap-2">
          <div>
            {report.data?.state === "RUNNING" ||
            report.data?.state === "PENDING" ? (
              <Button
                variant={"destructive"}
                onClick={() => cancel.mutate({ jobId })}
              >
                Stop instance
              </Button>
            ) : (
              <Button
                variant={"destructive"}
                onClick={() =>
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
                  )
                }
              >
                Clear dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="h-full w-2/3">
        <Logs jobId={jobId} />
      </div>
    </div>
  );
}
