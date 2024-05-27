import { DrizzleAdapter } from "@auth/drizzle-adapter";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import { type Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";

// import { env } from "~/env";
import { db } from "~/server/db";
import { z } from "zod";
import { createTable } from "~/server/db/schema";

import { users } from "./db/schema";
import { nanoid } from "nanoid";

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User extends DefaultUser {
  //   id: string;
  //   // role: UserRole;
  // }
}


/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id,
      },
    }),
  },
  session: {
    strategy: "jwt",
  },
  adapter: DrizzleAdapter(db, createTable) as Adapter,
  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "text",
          placeholder: "user.name@example.com",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Password",
        },
      },
      async authorize(credentials) {
        try {
          const { email } = await SignInSchema.parseAsync(credentials);

          const user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, email),
          });

          if (!user) {
            const id = nanoid();
            const newUser = {
              id,
              email,
            };

            await db.insert(users).values(newUser);

            return newUser;
          }

          return user;
        } catch (error) {
          if (error instanceof z.ZodError) {
            console.error(error.errors);
            return null;
          }
        }
        return null;
      },
    }),
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = () => getServerSession(authOptions);
