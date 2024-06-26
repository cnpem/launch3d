import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { sshRouter } from "./routers/ssh";
import { jobRouter } from "./routers/job";
import { annotat3dRouter } from "./routers/annotat3d";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  ssh: sshRouter,
  job: jobRouter,
  annotat3d: annotat3dRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
