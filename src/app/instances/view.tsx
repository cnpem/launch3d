"use client";
import { useCallback } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useQueryState } from 'nuqs';
import NewInstanceForm from "./new";
import Logs from "./logs";
import { Button } from "~/app/_components/ui/button";
import { SignOutButton } from "~/app/_components/signout-button";

export default function View() {
  const [jobId, setJobId] = useQueryState("jobId", { defaultValue: '' });

  const onJobIdChange = useCallback(async (jobId: string | undefined) => {
    await setJobId(jobId ?? '');
  }
  , [setJobId]);

  if (!jobId) {
    return <NewInstanceForm setJobId={onJobIdChange} />;
  }

  return <InstanceView jobId={jobId} setJobId={onJobIdChange}/>;
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

function InstanceView({ jobId, setJobId }: { jobId: string, setJobId: (jobId: string | undefined) => void}) {
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
      path: `~/annotat3d-start-${jobId}.out`,
      lines: 25,
    },
    {
      enabled: !!jobId && report.data?.state === "RUNNING",
    },
  );

  const url = getAnnotat3dWebUrl(stdout.data);

  return (
    <div className="my-auto flex h-full w-2/3 flex-row space-x-4">
      <div className="absolute right-0 top-0 m-4">
        <SignOutButton />
      </div>
      <div className="w-1/3">
        <p>Job ID: {jobId}</p>
        <p>Job status: {report.data?.state}</p>
        {report.data && (
          <>
            <p>Report</p>

            <p>State: {report.data.state}</p>
            <p>Partition: {report.data.partition}</p>
            <p>Node: {report.data.nodeList}</p>
            <p>Start time: {report.data.start}</p>
            <p>Elapsed time: {report.data.elapsed}</p>
            <p>AllocGRES: {report.data.allocGRES}</p>
            <p>AllocCPUS: {report.data.allocCPUS}</p>
          </>
        )}
        {url && (
          <p>
            Access the Annotat3D-web instance in{" "}
            <Link href={url} className="text-blue-500">
              {url}
            </Link>
          </p>
        )}
        <StopOrClearButton
          running={report.data?.state === "RUNNING" || report.data?.state === "PENDING"}
          onCancel={() => cancel.mutate({ jobId })}
          onClear={() => {
            setJobId(undefined);
          }}
        />
      </div>
      <div className="h-full w-2/3">
        <Logs jobId={jobId} />
      </div>
    </div>
  );
}

function StopOrClearButton({
  running,
  onCancel,
  onClear,
}: {
  running: boolean;
  onCancel: () => void;
  onClear: () => void;
}) {
  return (
    <div>
      {running ? (
        <Button onClick={onCancel}>Stop instance</Button>
      ) : (
        <Button onClick={onClear}>Clear dashboard</Button>
      )}
    </div>
  );
}
