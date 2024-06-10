import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { ssh } from "~/server/ssh";
import { getSSHKeys } from "~/server/ssh/utils";
import { env } from "~/env";

export const jobRouter = createTRPCRouter({
  status: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const jobId = input.jobId;
      const username = ctx.session.user.name;
      if (!username) {
        throw new Error("No user found");
      }
      const keys = getSSHKeys(username);
      if (!keys) {
        throw new Error("No keys found for user");
      }
      const connection = await ssh.connect({
        host: env.SSH_HOST,
        username: username,
        privateKey: keys.privateKey,
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
  cancel: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const jobId = input.jobId;
      const username = ctx.session.user.name;
      if (!username) {
        throw new Error("No user found");
      }
      const keys = getSSHKeys(username);
      if (!keys) {
        throw new Error("No keys found for user");
      }
      const connection = await ssh.connect({
        host: env.SSH_HOST,
        username: username,
        privateKey: keys.privateKey,
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
  report: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const jobId = input.jobId;
      const username = ctx.session.user.name;
      if (!username) {
        throw new Error("No user found");
      }
      const keys = getSSHKeys(username);
      if (!keys) {
        throw new Error("No keys found for user");
      }
      const connection = await ssh.connect({
        host: env.SSH_HOST,
        username: username,
        privateKey: keys.privateKey,
        passphrase: env.SSH_PASSPHRASE,
      });

      const command = `sacct --format="State,Start,Elapsed,Partition,NodeList,AllocGRES,AllocCPUS" --parsable2 --job ${jobId}`;
      const { stdout, stderr } = await connection.execCommand(command);

      connection.dispose();
      if (stderr) {
        throw new Error(stderr);
      }

      // the results come in many lines, the first line is the header and the second is the actual data we want
      const lines = stdout.trim().split("\n");
      const data = lines[1];
      if (!data) {
        throw new Error("No data found");
      }
      const [state, start, elapsed, partition, nodeList, allocGRES, allocCPUS] =
        data.split("|");
      return {
        state,
        start,
        elapsed,
        partition,
        nodeList,
        allocGRES,
        allocCPUS,
      };
    }),
  partitionOptions: protectedProcedure.query(async ({ ctx }) => {
    const username = ctx.session.user.name;
    if (!username) {
      throw new Error("No user found");
    }
    const keys = getSSHKeys(username);
    if (!keys) {
      throw new Error("No keys found for user");
    }
    const connection = await ssh.connect({
      host: env.SSH_HOST,
      username: username,
      privateKey: keys.privateKey,
      passphrase: env.SSH_PASSPHRASE,
    });

    const command = `sinfo --format=%P --noheader && echo "###" && sacctmgr show association -P -r format=Partition Users=${username} --noheader`;
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
});
