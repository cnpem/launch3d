"use client";
import { api } from "~/trpc/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const maxCPUs = 256;
const maxGPUs = 4;

export default function NewInstanceForm({
  setJobId,
}: {
  setJobId: (id: string | undefined) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{
    partition: string;
    gpus: number;
    cpus: number;
  }>();

  const createInstance = api.annotat3d.start.useMutation({
    onSuccess: ({ jobId }) => {
      toast.success("Instance started successfully");
      setJobId(jobId);
      reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: {
    partition: string;
    gpus: number;
    cpus: number;
  }) => {
    createInstance.mutate(data);
  };

  return (
    <div>
      <p>Start a new Annotat3D-web instance</p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
        <label className="flex flex-col gap-2">
          Partition
          <input
            type="text"
            {...register("partition", { required: true })}
            placeholder="gpu"
            className="w-full rounded-full px-4 py-2 text-black"
          />
        </label>
        <label className="flex flex-col gap-2">
          GPUs
          <input
            type="number"
            {...register("gpus", { required: true, min: 1, max: maxGPUs })}
            placeholder="1"
            className="w-full rounded-full px-4 py-2 text-black"
          />
        </label>
        <label className="flex flex-col gap-2">
          CPUs
          <input
            type="number"
            {...register("cpus", { required: true, min: 1, max: maxCPUs })}
            placeholder="1"
            className="w-full rounded-full px-4 py-2 text-black"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
          disabled={createInstance.isPending}
        >
          {createInstance.isPending ? "Starting..." : "Start"}
        </button>
      </form>
    </div>
  );
}
