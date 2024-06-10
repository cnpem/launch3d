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

export default function LogView({ jobId }: { jobId: string }) {
  const stdout = api.ssh.cat.useQuery({
    path: `~/${jobName}-${jobId}.out`,
  });

  const stderr = api.ssh.cat.useQuery({
    path: `~/${jobName}-${jobId}.err`,
  });

  return (
    <>
      <Tabs defaultValue="stdout" className="relative">
        <TabsList>
          <TabsTrigger value="stdout">stdout</TabsTrigger>
          <TabsTrigger value="stderr">stderr</TabsTrigger>
        </TabsList>
        <TabsContent value="stdout" className="h-72">
          <Textarea
            className="text-md h-full w-full resize-none bg-muted shadow-lg"
            value={stdout.data ?? stdout.error?.message}
            readOnly={true}
          />
        </TabsContent>
        <TabsContent value="stderr" className="h-72">
          <Textarea
            className="text-md h-full w-full resize-none bg-muted shadow-lg"
            value={stderr.data ?? stderr.error?.message}
            readOnly={true}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
