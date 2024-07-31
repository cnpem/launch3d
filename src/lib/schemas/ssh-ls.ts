import { z } from "zod";

export const sshLsSchema = z.array(
  z.string().refine((value) => value.trim() !== "", {
    message: "Invalid file name.",
  }),
);
