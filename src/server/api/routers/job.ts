import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedureWithCredentials,
} from "~/server/api/trpc";
import { ssh } from "~/server/ssh";
import { env } from "~/env";
import { TRPCError } from "@trpc/server";
import fs from "fs/promises";
import { jobName } from "~/lib/constants";
import {
  type StepStatus,
  type InstanceSteps,
  type JobStates,
} from "~/lib/types";
import { userPartitionsResponseSchema } from "~/lib/schemas/user-partitions-response";

const errorStates: JobStates[] = [
  "SUSPENDED",
  "FAILED",
  "TIMEOUT",
  "NODE_FAIL",
  "PREEMPTED",
  "BOOT_FAIL",
  "OOM",
] as const;

const finishStates: JobStates[] = ["COMPLETE", "CANCELLED", "DEADLINE"];

// from the query format State,Submit,Start,End,Elapsed,Partition,NodeList,AllocGRES,NCPUS,Reason,ExitCode
const reportSacctFormatSchema = z.object({
  state: z.string(),
  submit: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  elapsed: z.string().optional(),
  partition: z.string().optional(),
  nodeList: z.string().optional(),
  allocGRES: z.string().optional(),
  nCPUS: z.string().optional(),
  reason: z.string().optional(),
  exitCode: z.string().optional(),
});

function checkInstanceSteps(
  report: z.infer<typeof reportSacctFormatSchema>,
): InstanceSteps {
  const steps: InstanceSteps = {
    submit: checkSubmitStatus(report),
    start: checkStartStatus(report),
    finish: checkFinishStatus(report),
  };
  return steps;
}

function checkSubmitStatus(
  report: z.infer<typeof reportSacctFormatSchema>,
): StepStatus {
  if (report.submit !== "Unknown" || report.state === "PENDING") {
    return "success";
  }
  return "error";
}

function checkStartStatus(
  report: z.infer<typeof reportSacctFormatSchema>,
): StepStatus {
  if (report.start !== "Unknown") {
    if (errorStates.includes(report.state as JobStates)) {
      return "error";
    } else {
      return "success";
    }
  }
  return "unknown";
}

function checkFinishStatus(
  report: z.infer<typeof reportSacctFormatSchema>,
): StepStatus {
  if (report.end !== "Unknown") {
    return finishStates.includes(report.state as JobStates)
      ? "success"
      : "error";
  }
  return "unknown";
}

export const jobRouter = createTRPCRouter({
  status: protectedProcedureWithCredentials
    .input(
      z.object({
        jobId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const jobId = input.jobId;
      const connection = await ssh.connect({
        host: env.SSH_HOST,
        username: ctx.session.credentials.name,
        privateKey: ctx.session.credentials.keys.privateKey,
        passphrase: env.SSH_PASSPHRASE,
      });

      const command = `sacct --job ${jobId}.batch --format=State --parsable2`;
      const { stdout, stderr } = await connection.execCommand(command);

      connection.dispose();
      if (stderr) {
        throw new Error(stderr);
      }

      // The output of the sacct command comes in two lines, the first line is the header and the second is the actual state: i.e. State\nRUNNING, State\nCOMPLETED, etc.
      const lines = stdout.trim().split("\n");
      const status = lines[1];
      if (!status) {
        // If the status is empty, it means the job.batch wasn't found, but the job might be PENDING
        const command = `sacct --job ${jobId} --format=State --parsable2`;
        const { stdout, stderr } = await connection.execCommand(command);
        if (stderr) {
          throw new Error(stderr);
        }
        const lines = stdout.trim().split("\n");
        const status = lines[1];
        return { jobStatus: status };
      }
      return { jobStatus: status };
    }),
  cancel: protectedProcedureWithCredentials
    .input(
      z.object({
        jobId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const jobId = input.jobId;
      const connection = await ssh.connect({
        host: env.SSH_HOST,
        username: ctx.session.credentials.name,
        privateKey: ctx.session.credentials.keys.privateKey,
        passphrase: env.SSH_PASSPHRASE,
      });

      const command = `scancel ${jobId}`;
      const { stderr } = await connection.execCommand(command);
      connection.dispose();

      if (stderr) {
        throw new Error(stderr);
      }

      return { cancelStatus: "CANCELLED" };
    }),
  report: protectedProcedureWithCredentials
    .input(
      z.object({
        jobId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const jobId = input.jobId;

      const connection = await ssh.connect({
        host: env.SSH_HOST,
        username: ctx.session.credentials.name,
        privateKey: ctx.session.credentials.keys.privateKey,
        passphrase: env.SSH_PASSPHRASE,
      });

      const command = `sacct --format="State,Submit,Start,End,Elapsed,Partition,NodeList,AllocGRES,NCPUS,Reason,ExitCode,name" --parsable2 --job ${jobId} --noheader`;
      const { stdout, stderr } = await connection.execCommand(command);

      connection.dispose();

      if (stderr) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: stderr,
        });
      }

      const data = stdout.trim();
      if (data.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job data not found",
        });
      }

      const firstline = data.split("\n")[0];
      if (!firstline) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error parsing job data for jobId ${jobId}`,
        });
      }
      const supername = "oi";

      const [
        state,
        submit,
        start,
        end,
        elapsed,
        partition,
        nodeList,
        allocGRES,
        nCPUS,
        reason,
        exitCode,
      ] = data.split("|");

      const report = reportSacctFormatSchema.safeParse({
        state: state?.split(" ")[0] ?? state, // the state comes with a suffix that we don't need, so we split it and get the first part
        submit,
        start,
        end,
        elapsed,
        partition,
        nodeList,
        allocGRES,
        nCPUS,
        reason,
        exitCode,
      });

      if (report.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error parsing job data:" + report.error.message,
        });
      }

      return {
        ...report.data,
        steps: checkInstanceSteps(report.data),
        supername,
      };
    }),
  partitionOptions: protectedProcedureWithCredentials.query(async ({ ctx }) => {
    const connection = await ssh.connect({
      host: env.SSH_HOST,
      username: ctx.session.credentials.name,
      privateKey: ctx.session.credentials.keys.privateKey,
      passphrase: env.SSH_PASSPHRASE,
    });

    const command = `sinfo --format=%P --noheader && echo "###" && sacctmgr show association -P -r format=Partition Users=${ctx.session.credentials.name} --noheader`;
    const { stdout, stderr } = await connection.execCommand(command);

    connection.dispose();
    if (stderr) {
      throw new Error(stderr);
    }

    // the result is two lists separated by a ### string,
    // the first list is a list of all the partitions available in the cluster
    // the second list is a list of all the specific partitions available for that user
    // if the second list has an empty line, the user can submit jobs for all the partitions of the cluster
    const [clusterStr, userStr] = stdout.trim().split("###\n");

    const clusterPartitions = clusterStr?.split("\n");
    const userPartitions = userStr?.split("\n");

    if (!clusterPartitions) {
      throw new Error(
        "Cannot find available partitions of the cluster with sinfo.",
      );
    }

    if (!userPartitions) {
      return {
        partitions: clusterPartitions,
      };
    }

    return { partitions: userPartitions };
  }),
  userPartitions: protectedProcedureWithCredentials.query(async ({ ctx }) => {
    const connection = await ssh.connect({
      host: env.SSH_HOST,
      username: ctx.session.credentials.name,
      privateKey: ctx.session.credentials.keys.privateKey,
      passphrase: env.SSH_PASSPHRASE,
    });

    const templatePath = "public/templates/user-partitions.sh";
    const scriptTemplate = await fs.readFile(templatePath, "utf-8");

    const content = scriptTemplate.replace(
      "${INPUT_USERNAME}",
      ctx.session.credentials.name,
    );

    const { stdout, stderr } = await connection.execCommand(content);

    connection.dispose();
    if (stderr) {
      throw new Error(stderr);
    }

    if (stdout.trim().length === 0) {
      throw new Error("Empty response from user partitions script.");
    }

    const parsed = userPartitionsResponseSchema.safeParse(
      JSON.parse(stdout.trim()),
    );
    if (parsed.error) {
      throw new Error(parsed.error.message);
    }

    function parseNumberOrUndefined(value: string | null | undefined) {
      if (value === null || value === undefined) {
        return undefined;
      }
      if (value === "null") {
        return undefined;
      }
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        return undefined;
      }
      return parsed;
    }

    const partitions = parsed.data.partitions.map((partition) => {
      // if the groupQoSLimit is set for a limit it overrides the partition limit from cpusState and total gpus from gresTotal
      const maxGpus = parseNumberOrUndefined(partition.groupQoSLimit?.gpu) ?? parseNumberOrUndefined(partition.gresTotal) ?? 0;
      const maxCpus = parseNumberOrUndefined(partition.groupQoSLimit?.cpu) ?? parseNumberOrUndefined(partition.cpusState.total) ?? 0;
      const usedCpus = parseNumberOrUndefined(partition.cpusState.allocated) ?? 0;
      const usedGpus = parseNumberOrUndefined(partition.gresUsed) ?? 0;
      const freeCpus = maxCpus > 0 ? maxCpus - usedCpus: 0;
      const freeGpus = maxGpus > 0 ? maxGpus - usedGpus: 0;

      return {
        partition: partition.partitionName,
        nodeList: partition.nodeList,
        cpus: {
          free: freeCpus,
          max: maxCpus,
        },
        gpus: {
          free: freeGpus,
          max: maxGpus,
        },
      };
    });

    return { partitions };
  }),
  userRecentJobs: protectedProcedureWithCredentials.query(async ({ ctx }) => {
    const connection = await ssh.connect({
      host: env.SSH_HOST,
      username: ctx.session.credentials.name,
      privateKey: ctx.session.credentials.keys.privateKey,
      passphrase: env.SSH_PASSPHRASE,
    });

    const command = `sacct --parsable2 --user ${ctx.session.credentials.name} --name ${jobName} --allocations --format=JobID,State --noheader`;
    const { stdout, stderr } = await connection.execCommand(command);

    connection.dispose();
    if (stderr) {
      throw new Error(stderr);
    }

    if (stdout.trim().length === 0) {
      return { jobs: [] } as { jobs: { jobId: string; state: string }[] };
    }

    const jobs = stdout
      .trim()
      .split("\n")
      .map((line) => {
        const [jobId, jobState] = line.split("|");
        if (!jobId || !jobState) {
          return;
        }
        // the job state comes with a suffix that we don't need, so we split it and get the first part
        return { jobId, state: jobState.split("_")[0] ?? jobState };
      })
      .filter(Boolean) as { jobId: string; state: string }[];

    return { jobs };
  }),
});
