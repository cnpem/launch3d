export const jobName = "annotat3dweb";
export const jobLogName = `${jobName}-%j` as const;
export const jobGPUOptions = process.env.NEXT_PUBLIC_SLURM_GPU_OPTIONS?.split(
  ",",
) ?? ["1"];
export const maxCPUs = process.env.NEXT_PUBLIC_SLURM_MAX_CPUS
  ? parseInt(process.env.NEXT_PUBLIC_SLURM_MAX_CPUS)
  : 1;
export const MISSING_SSH_KEYS_ERROR = "No ssh keys found";

export interface ErrnoException extends Error {
  errno?: number;
  code?: number | string;
  path?: string;
  syscall?: string;
  stack?: string;
}
