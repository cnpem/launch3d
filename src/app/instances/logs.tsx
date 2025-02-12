"use client";
import { api } from "~/trpc/react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/app/_components/ui/tabs";
import { Textarea } from "~/app/_components/ui/textarea";
import { jobName } from "~/lib/constants";
import { useEffect } from "react";

export default function LogView({ jobId }: { jobId: string }) {
  const utils = api.useUtils();
  const stdout = api.ssh.cat.useQuery({
    path: `~/${jobName}-${jobId}.out`,
  });

  const stderr = api.ssh.cat.useQuery({
    path: `~/${jobName}-${jobId}.err`,
  });

  useEffect(() => {
    if (stdout.data ?? stderr.data) {
      utils.job.report.invalidate({ jobId }).catch((error) => {
        console.error("Failed to invalidate report query:", error);
      });
    }
  }, [stdout.data, stderr.data, utils.job.report, jobId]);

  return (
    <Tabs defaultValue="stdout" className="h-full w-full">
      <TabsList>
        <TabsTrigger value="stdout">stdout</TabsTrigger>
        <TabsTrigger value="stderr">stderr</TabsTrigger>
      </TabsList>
      <TabsContent value="stdout" className="lg:h-[500px]">
        <Textarea
          data-iserror={stdout.isError}
          className="text-md h-full w-full resize-none bg-muted shadow-lg data-[iserror=true]:text-red-500"
          value={stdout.data ?? stdout.error?.message}
          readOnly={true}
        />
      </TabsContent>
      <TabsContent value="stderr" className="lg:h-[500px]">
        <Textarea
          data-iserror={stderr.isError}
          className="text-md h-full w-full resize-none bg-muted shadow-lg data-[iserror=true]:text-red-500"
          value={stderr.data ?? stderr.error?.message}
          readOnly={true}
        />
      </TabsContent>
    </Tabs>
  );
}
