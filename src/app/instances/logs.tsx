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
    <Tabs defaultValue="stdout">
      <TabsList>
        <TabsTrigger value="stdout">stdout</TabsTrigger>
        <TabsTrigger value="stderr">stderr</TabsTrigger>
      </TabsList>
      <TabsContent value="stdout" className="lg:h-[500px]">
        <Textarea
          data-isError={stdout.isError}
          className="text-md h-full w-full resize-none bg-muted shadow-lg data-[isError=true]:text-red-500"
          value={stdout.data ?? stdout.error?.message}
          readOnly={true}
        />
      </TabsContent>
      <TabsContent value="stderr" className="lg:h-[500px]">
        <Textarea
          data-isError={stderr.isError}
          className="text-md h-full w-full resize-none bg-muted shadow-lg data-[isError=true]:text-red-500"
          value={stderr.data ?? stderr.error?.message}
          readOnly={true}
        />
      </TabsContent>
    </Tabs>
  );
}
