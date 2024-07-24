import { z } from "zod";

const cpusStateSchema = z.object({
  allocated: z.string(),
  idle: z.string(),
  other: z.string(),
  total: z.string(),
});

const groupQoSLimitSchema = z.object({
  cpu: z.union([z.string(), z.null()]).optional(),
  gpu: z.union([z.string(), z.null()]).optional(),
  mem: z.union([z.string(), z.null()]).optional(),
});

const partitionSchema = z.object({
  partitionName: z.string(),
  qos: z.string(),
  nodeList: z.string(),
  cpusState: cpusStateSchema,
  gresTotal: z.string(),
  gresUsed: z.string(),
  groupQoSLimit: groupQoSLimitSchema,
});

export const userPartitionsResponseSchema = z.object({
  username: z.string(),
  partitions: z.array(partitionSchema),
});
