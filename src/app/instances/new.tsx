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
  useFormField,
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
import {
  FilePenLineIcon,
  FileSlidersIcon,
  FolderIcon,
  FolderSearchIcon,
  ImageIcon,
  MoveLeftIcon,
  XIcon,
} from "lucide-react";
import { useKeysError } from "../_hooks/use-keys-error";
import { NautilusDialog } from "~/app/_components/nautilus";
import { Label } from "../_components/ui/label";
import {
  imagePathSchema,
  annotationPathSchema,
  outputDirSchema,
  validImageExtensions,
  validAnnotationExtensions,
  classModelPathSchema,
  validClassModelExtensions,
} from "~/lib/schemas/form-input-paths";
import React, { useState } from "react";

export default function NewInstanceForm({
  setJobId,
}: {
  setJobId: (id: string | undefined) => void;
}) {
  const utils = api.useUtils();

  const userPartitions = api.job.userPartitions.useQuery();
  const [lastBasePath, setLastBasePath] = useState<string | undefined>(
    undefined,
  );

  useKeysError({
    isError: userPartitions.isError,
    error: userPartitions.error,
  });

  const formSchema = z
    .object({
      imagePath: imagePathSchema,
      labelPath: imagePathSchema.optional(),
      superpixelPath: imagePathSchema.optional(),
      annotationPath: annotationPathSchema.optional(),
      classModelPath: classModelPathSchema.optional(),
      outputDir: outputDirSchema,
      partition: z.string(),
      gpus: z.coerce.number().int().min(1, "At least 1 GPU is required"),
      cpus: z.coerce
        .number()
        .int()
        .min(1, "At least 1 CPU is required")
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
      gpus: 1,
      cpus: 32,
    },
  });

  const createInstance = api.annotat3d.start.useMutation({
    onSuccess: async ({ jobId }) => {
      toast.success("Job submitted");
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
      <div className="mb-8 flex w-96 flex-col items-center gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Launch Annotat<span className="text-[hsl(280,100%,70%)]">3D</span>
        </h1>
        <p className="text-wrap text-center text-slate-400">
          Configure a job that will start an instance of Annotat3D.
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col rounded-lg border border-gray-200 p-12 shadow-lg"
        >
          <div className="flex h-fit flex-row overflow-visible">
            <div
              id="load-files"
              className="max-gap-2 flex flex-col items-center"
            >
              <Label
                htmlFor="load-files"
                className="text-md mb-4 text-[hsl(280,100%,70%)]"
              >
                Load files
              </Label>
              <FormField
                control={form.control}
                name={"imagePath"}
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <NautilusInput
                        fieldLabel="Image"
                        fieldDescription={`Select image file with the following extensions: ${validImageExtensions.join(", ")}.`}
                        fieldValue={field.value}
                        fieldIcon={<ImageIcon className="h-4 w-4" />}
                        onSelectPath={(path) => {
                          field.onChange(path);
                          setLastBasePath(
                            path.split("/").slice(0, -1).join("/"),
                          );
                        }}
                        onClearPath={() => field.onChange(undefined)}
                        basePath={lastBasePath}
                      />
                    </FormControl>
                    <FormMessage className="text-wrap text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"labelPath"}
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <NautilusInput
                        fieldLabel="Label"
                        fieldDescription={`Select label file with the following extensions: ${validImageExtensions.join(", ")}.`}
                        fieldValue={field.value}
                        fieldIcon={<ImageIcon className="h-4 w-4" />}
                        onSelectPath={(path) => {
                          setLastBasePath(
                            path.split("/").slice(0, -1).join("/"),
                          );
                          field.onChange(path);
                        }}
                        onClearPath={() => field.onChange(undefined)}
                        basePath={lastBasePath}
                      />
                    </FormControl>
                    <FormMessage className="text-wrap text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"superpixelPath"}
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <NautilusInput
                        fieldLabel="Superpixel"
                        fieldDescription={`Select superpixel file with the following extensions: ${validImageExtensions.join(", ")}.`}
                        fieldValue={field.value}
                        fieldIcon={<ImageIcon className="h-4 w-4" />}
                        onSelectPath={(path) => {
                          field.onChange(path);
                          setLastBasePath(
                            path.split("/").slice(0, -1).join("/"),
                          );
                        }}
                        onClearPath={() => field.onChange(undefined)}
                        basePath={lastBasePath}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"annotationPath"}
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <NautilusInput
                        fieldLabel="Annotation"
                        fieldDescription={`Select annotation file with the following extensions: ${validAnnotationExtensions.join(", ")}.`}
                        fieldValue={field.value}
                        fieldIcon={<FilePenLineIcon className="h-4 w-4" />}
                        onSelectPath={(path) => {
                          field.onChange(path);
                          setLastBasePath(
                            path.split("/").slice(0, -1).join("/"),
                          );
                        }}
                        onClearPath={() => field.onChange(undefined)}
                        basePath={lastBasePath}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"classModelPath"}
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <NautilusInput
                        fieldLabel="Classifier"
                        fieldDescription={`Select file with the following extensions: ${validClassModelExtensions.join(", ")}.`}
                        fieldValue={field.value}
                        fieldIcon={<FileSlidersIcon className="h-4 w-4" />}
                        onSelectPath={(path) => {
                          field.onChange(path);
                          setLastBasePath(
                            path.split("/").slice(0, -1).join("/"),
                          );
                        }}
                        onClearPath={() => field.onChange(undefined)}
                        basePath={lastBasePath}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"outputDir"}
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <NautilusInput
                        fieldLabel="Output"
                        fieldDescription={`Select an existing path for the output directory.`}
                        fieldValue={field.value}
                        fieldIcon={<FolderIcon className="h-4 w-4" />}
                        onSelectPath={(path) => {
                          field.onChange(path);
                          setLastBasePath(
                            path.split("/").slice(0, -1).join("/"),
                          );
                        }}
                        onClearPath={() => field.onChange(undefined)}
                        basePath={lastBasePath}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            <div
              id="job-settings"
              className="max-gap-2 ml-4 flex flex-col items-center border-l-2 border-dashed pl-4 text-start"
            >
              <Label
                htmlFor="job-settings"
                className="text-md mb-4 text-[hsl(280,100%,70%)]"
              >
                Job Settings
              </Label>
              <FormField
                control={form.control}
                name="partition"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-0">
                    <div className="flex flex-row items-center justify-between">
                      <FormLabel className="w-20">Partition</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        disabled={
                          userPartitions.isError || userPartitions.isLoading
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="mt-2 w-40">
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
                    </div>
                    <FormMessage className="max-w-60 text-wrap">
                      {userPartitions.isError &&
                        `Error loading partitions: ${userPartitions.error.message}`}
                      {userPartitions.isLoading &&
                        `Searching user partitions...`}
                    </FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gpus"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-0">
                    <div className="flex flex-row items-center justify-between">
                      <FormLabel className="w-20">GPUs</FormLabel>
                      <Select
                        defaultValue={field.value.toString()}
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="mt-2 w-40">
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
                    </div>
                    <FormMessage className="max-w-60 text-wrap" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cpus"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-0">
                    <div className="flex flex-row items-center justify-between">
                      <FormLabel className="w-20">CPUs</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          className="mt-2 w-40"
                          placeholder="no. of CPUs"
                        />
                      </FormControl>
                      <FormDescription className="sr-only">
                        Number of CPUs to use
                      </FormDescription>
                    </div>
                    <FormMessage className="max-w-60 text-wrap" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={createInstance.isPending}
                className="mt-auto w-full"
              >
                {createInstance.isPending ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
          {createInstance.error && (
            <FormMessage className="mx-auto mt-4 max-w-prose text-wrap text-justify">
              {createInstance.error.message}
            </FormMessage>
          )}
        </form>
      </Form>
    </>
  );
}

function formatInputValue(value: string | undefined) {
  const pathParts = value?.split("/");
  if (!pathParts) return undefined;
  const fileName = pathParts.slice(-1)[0];
  const innerMostDir = pathParts.slice(-2, -1)[0];
  if (!innerMostDir) return undefined;
  if (fileName === "") return `${innerMostDir}/`;
  return `${fileName}`;
}

function NautilusInput({
  fieldLabel,
  fieldDescription,
  fieldValue,
  fieldIcon,
  onSelectPath,
  onClearPath,
  basePath,
}: {
  fieldLabel: string;
  fieldDescription: string;
  fieldValue: string | undefined;
  fieldIcon: React.ReactNode;
  onSelectPath: (path: string) => void;
  onClearPath: () => void;
  basePath: string | undefined;
}) {
  const { error, formItemId } = useFormField();
  return (
    <div className="flex flex-row items-center justify-between">
      <Label
        htmlFor={formItemId}
        className={cn(
          error && "text-destructive",
          "flex w-28 flex-row items-center gap-1 p-2 text-sm",
        )}
      >
        <span>{fieldIcon}</span>
        {fieldLabel}
      </Label>
      <HoverCard openDelay={500} closeDelay={100}>
        <HoverCardTrigger className="flex w-fit flex-row items-center gap-2">
          <NautilusDialog
            fieldName={fieldLabel}
            fieldDescription={fieldDescription}
            onSelect={(path) => {
              onSelectPath(path);
            }}
            startPath={basePath}
            trigger={
              <div
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "mt-2 w-60 justify-between font-normal",
                )}
              >
                <span className="overflow-hidden overflow-ellipsis">
                  {formatInputValue(fieldValue) ?? "Select file"}
                </span>
                {!fieldValue ? (
                  <FolderSearchIcon className="h-4 w-4 text-muted-foreground " />
                ) : (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearPath();
                    }}
                    variant={"ghost"}
                    size={"icon"}
                    className="h-5 w-5 text-red-500 "
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            }
          />
        </HoverCardTrigger>
        <NautilusHoverCardContent
          selectedPath={fieldValue}
          fieldLabel={fieldLabel}
          fieldDescription={fieldDescription}
        />
      </HoverCard>
    </div>
  );
}

function NautilusHoverCardContent({
  selectedPath,
  fieldLabel,
  fieldDescription,
  children,
}: {
  selectedPath: string | undefined;
  fieldLabel: string;
  fieldDescription: string;
  children?: React.ReactNode;
}) {
  if (!selectedPath)
    return (
      <HoverCardContent className="w-fit">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{fieldDescription}</p>
        </div>
      </HoverCardContent>
    );

  return (
    <HoverCardContent className="w-fit">
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold">{fieldLabel}</h4>
        <div className="flex gap-2">
          <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
            {selectedPath?.split("/").slice(-1)[0] ?? ""}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{selectedPath}</span>
      </div>
      {children}
    </HoverCardContent>
  );
}
