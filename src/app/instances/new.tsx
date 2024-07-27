"use client";
import { api } from "~/trpc/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { HoverCardTrigger } from "@radix-ui/react-hover-card";
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
import { Button, buttonVariants } from "~/app/_components/ui/button";
import { HoverCard, HoverCardContent } from "~/app/_components/ui/hover-card";
import { cn } from "~/lib/utils";
import { jobGPUOptions, maxCPUs } from "~/lib/constants";
import { ImageIcon, ImagePlusIcon, MoveLeftIcon } from "lucide-react";
import { useKeysError } from "../_hooks/use-keys-error";
import { NautilusDialog } from "~/app/_components/nautilus";
import { Label } from "../_components/ui/label";
import { imagePathSchema, annotationPathSchema } from "~/lib/schemas/form-input-paths";

export default function NewInstanceForm({
  setJobId,
}: {
  setJobId: (id: string | undefined) => void;
}) {
  const utils = api.useUtils();

  const userPartitions = api.job.userPartitions.useQuery();

  useKeysError({
    isError: userPartitions.isError,
    error: userPartitions.error,
  });

  const formSchema = z
    .object({
      // input paths for images, labels, superpixels, and annotations
      imagePath: imagePathSchema,
      labelPath: imagePathSchema.optional(),
      superpixelPath: imagePathSchema.optional(),
      annotationPath: annotationPathSchema.optional(),
      partition: z.string(),
      gpus: z.coerce.string(),
      cpus: z.coerce
        .number()
        .int()
        .positive()
        .max(maxCPUs, `Max CPUs is ${maxCPUs}`),
    })
    .superRefine(({ partition }, ctx) => {
      if (userPartitions.error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Loading...",
          fatal: true,
        });
        return z.NEVER;
      }
      if (
        userPartitions.data &&
        !userPartitions.data.partitions.some((p) => p.partition === partition)
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
          <Label htmlFor="images-and-annotations">Images and Annotations</Label>
          <div className="rounded-lg border border-dashed border-gray-200 p-2">
            <div
              id="iimages-and-annotations"
              className="grid w-full grid-flow-col grid-cols-2 grid-rows-2 items-center gap-2"
            >
              <FormField
                control={form.control}
                name={"imagePath"}
                render={({ field }) => (
                  <FormItem>
                    <HoverCard>
                      <NautilusDialog
                        onSelect={(path) => field.onChange(path)}
                        trigger={
                          <HoverCardTrigger asChild>
                            <Button
                              className="w-32 gap-1 data-[img=true]:border-violet-600 data-[img=true]:dark:border-violet-400"
                              data-img={!!field.value}
                              variant={"outline"}
                            >
                              {!!field.value ? (
                                <ImageIcon className="h-4 w-4" />
                              ) : (
                                <ImagePlusIcon className="h-4 w-4" />
                              )}
                              Image
                            </Button>
                          </HoverCardTrigger>
                        }
                      />
                      <HoverCardContent className="w-fit">
                        <div className="flex flex-col gap-2">
                          <h4 className="text-sm font-semibold">@image</h4>
                          <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
                            {field.value?.split("/").slice(-1)[0] ?? ""}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {field.value}
                          </span>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"labelPath"}
                render={({ field }) => (
                  <FormItem>
                    <HoverCard>
                      <NautilusDialog
                        onSelect={(path) => field.onChange(path)}
                        trigger={
                          <HoverCardTrigger asChild>
                            <Button
                              className="w-32 gap-1 data-[img=true]:border-violet-600 data-[img=true]:dark:border-violet-400"
                              data-img={!!field.value}
                              variant={"outline"}
                            >
                              {!!field.value ? (
                                <ImageIcon className="h-4 w-4" />
                              ) : (
                                <ImagePlusIcon className="h-4 w-4" />
                              )}
                              Label
                            </Button>
                          </HoverCardTrigger>
                        }
                      />
                      <HoverCardContent className="w-fit">
                        <div className="flex flex-col gap-2">
                          <h4 className="text-sm font-semibold">@label</h4>
                          <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
                            {field.value?.split("/").slice(-1)[0] ?? ""}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {field.value}
                          </span>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"superpixelPath"}
                render={({ field }) => (
                  <FormItem>
                    <HoverCard>
                      <NautilusDialog
                        onSelect={(path) => field.onChange(path)}
                        trigger={
                          <HoverCardTrigger asChild>
                            <Button
                              className="w-32 gap-1 data-[img=true]:border-violet-600 data-[img=true]:dark:border-violet-400"
                              data-img={!!field.value}
                              variant={"outline"}
                            >
                              {!!field.value ? (
                                <ImageIcon className="h-4 w-4" />
                              ) : (
                                <ImagePlusIcon className="h-4 w-4" />
                              )}
                              Superpixel
                            </Button>
                          </HoverCardTrigger>
                        }
                      />
                      <HoverCardContent className="w-fit">
                        <div className="flex flex-col gap-2">
                          <h4 className="text-sm font-semibold">@superpixel</h4>
                          <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
                            {field.value?.split("/").slice(-1)[0] ?? ""}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {field.value}
                          </span>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"annotationPath"}
                render={({ field }) => (
                  <FormItem>
                    <HoverCard>
                      <NautilusDialog
                        onSelect={(path) => field.onChange(path)}
                        trigger={
                          <HoverCardTrigger asChild>
                            <Button
                              className="w-32 gap-1 data-[img=true]:border-violet-600 data-[img=true]:dark:border-violet-400"
                              data-img={!!field.value}
                              variant={"outline"}
                            >
                              {!!field.value ? (
                                <ImageIcon className="h-4 w-4" />
                              ) : (
                                <ImagePlusIcon className="h-4 w-4" />
                              )}
                              Annotation
                            </Button>
                          </HoverCardTrigger>
                        }
                      />
                      <HoverCardContent className="w-fit">
                        <div className="flex flex-col gap-2">
                          <h4 className="text-sm font-semibold">@annotation</h4>
                          <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
                            {field.value?.split("/").slice(-1)[0] ?? ""}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {field.value}
                          </span>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </div>
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
                  disabled={userPartitions.isError || userPartitions.isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select partition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {userPartitions.data?.partitions.map((option) => (
                      <SelectItem
                        key={option.partition}
                        value={option.partition}
                        className="!text-justify"
                      >
                        <span className="mr-2 font-bold">
                          {option.partition}
                        </span>
                        <span className="text-sm text-gray-500">
                          <span className="text-sm text-green-500">
                            {option.cpus.free}
                          </span>
                          /{option.cpus.max} cpus,{" "}
                          <span className="text-sm text-green-500">
                            {option.gpus.free}
                          </span>
                          /{option.gpus.max} gpus
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="sr-only">
                  Partition to run the instance on
                </FormDescription>
                <FormMessage>
                  {userPartitions.isError &&
                    `Error loading partitions: ${userPartitions.error.message}`}
                  {userPartitions.isLoading && `Searching user partitions...`}
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
                <FormDescription className="sr-only">
                  Number of GPUs to use
                </FormDescription>
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
                <FormDescription className="sr-only">
                  Number of CPUs to use
                </FormDescription>
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
