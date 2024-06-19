"use client";
import { api } from "~/trpc/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/app/_components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/app/_components/ui/select";
import { Input } from "~/app/_components/ui/input";
import { Button } from "~/app/_components/ui/button";
import { cn } from "~/lib/utils";
import { buttonVariants } from "~/app/_components/ui/button";
import { jobGPUOptions, maxCPUs } from "~/lib/constants";
import { MoveLeftIcon } from "lucide-react";
import { useKeysError } from "../_hooks/use-keys-error";

export default function NewInstanceForm({
  setJobId,
}: {
  setJobId: (id: string | undefined) => void;
}) {
  const utils = api.useUtils();

  const partitionOptions = api.job.partitionOptions.useQuery();

  useKeysError({ isError: partitionOptions.isError, error: partitionOptions.error });

  const formSchema = z
    .object({
      partition: z.string(),
      gpus: z.coerce.string().refine((value) => jobGPUOptions.includes(value)),
      cpus: z.coerce
        .number()
        .int()
        .positive()
        .max(maxCPUs, `Max CPUs is ${maxCPUs}`),
    })
    .superRefine(({ partition }, ctx) => {
      if (partitionOptions.error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Loading...",
          fatal: true,
        });
        return z.NEVER;
      }
      if (
        partitionOptions.data &&
        !partitionOptions.data.partitions.includes(partition)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid partition",
          path: ["partition"],
        });
      }
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cpus: 32,
    },
  });

  const createInstance = api.annotat3d.start.useMutation({
    onSuccess: async ({ jobId }) => {
      toast.success("Instance started successfully");
      setJobId(jobId);
      form.reset();
      await utils.job.userRecentJobs.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    await createInstance.mutateAsync(data);
  };

  return (
    <>
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
      <Form {...form}>
        <div className="mb-8 flex w-96 flex-col items-center gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Launch Annotat<span className="text-[hsl(280,100%,70%)]">3D</span>
          </h1>
          <p className="text-wrap text-center text-slate-400">
            Configure a job that will start an instance of Annotat3D.
          </p>
        </div>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-96 flex-col gap-4 rounded-lg border border-gray-200 p-12 shadow-lg"
        >
          <FormField
            control={form.control}
            name="partition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Partition</FormLabel>
                <Select
                  {...field}
                  onValueChange={(value) => {
                    field.onChange(value);
                  }}
                  disabled={
                    partitionOptions.isError || partitionOptions.isLoading
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select partition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {partitionOptions.data?.partitions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="sr-only">
                  Partition to run the instance on
                </FormDescription>
                <FormMessage>
                  {partitionOptions.isError &&
                    `Error loading partitions: ${partitionOptions.error.message}`}
                  {partitionOptions.isLoading && `Searching user partitions...`}
                </FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gpus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GPUs</FormLabel>
                <Select
                  {...field}
                  onValueChange={(value) => {
                    field.onChange(value);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select GPUs" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {jobGPUOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="sr-only">Number of GPUs to use</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cpus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPUs</FormLabel>
                <Input {...field} type="number" />
                <FormDescription className="sr-only">Number of CPUs to use</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={createInstance.isPending}
            className="w-full"
          >
            {createInstance.isPending ? "Starting..." : "Start"}
          </Button>
          {createInstance.error && (
            <FormMessage>{createInstance.error.message}</FormMessage>
          )}
        </form>
      </Form>
    </>
  );
}
