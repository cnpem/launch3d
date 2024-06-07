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

export default function LogView({
  jobId,
}: {
  jobId: string;
}) {
  const stdout = api.ssh.cat.useQuery({
    path: `~/${jobName}-${jobId}.out`,
  });

  const stderr = api.ssh.cat.useQuery({
    path: `~/${jobName}-${jobId}.err`,
  });

  function checkData(data: string | undefined, isLoading: boolean, isError: boolean) {
    if (isLoading) {
      return "Loading...";
    }
    if (isError) {
      return "Error loading logs";
    }
    if (!data) {
      return "File is empty";
    }
    return data
  }

  return (
    <Tabs defaultValue="stdout">
      <TabsList>
        <TabsTrigger value="stdout">stdout</TabsTrigger>
        <TabsTrigger value="stderr">stderr</TabsTrigger>
      </TabsList>
      <TabsContent value="stdout" className="h-72">
        <Textarea
          className="text-md h-full w-full resize-none bg-muted shadow-lg"
          value={checkData(stdout.data, stdout.isLoading, stdout.isError)}
          readOnly={true}
        />
      </TabsContent>
      <TabsContent value="stderr" className="h-72">
        <Textarea
          className="text-md h-full w-full resize-none bg-muted shadow-lg"
          value={checkData(stderr.data, stderr.isLoading, stderr.isError)}
          readOnly={true}
        />
      </TabsContent>
    </Tabs>
  );
}
