import { promisify } from "util";
import { ssh } from ".";
import { env } from "~/env";
import { exec } from "child_process";
import fs from "fs/promises";

const db: Record<string, { publicKey: string; privateKey: string }> = {};

const execAsync = promisify(exec);

export async function generateSSHKeyPair(username: string) {
  const location = `${env.SSH_KEYS_PATH}/${username}_id_rsa`;
  const passphrase = env.SSH_PASSPHRASE;
  const comment = `${username}@annotat3d`;
  const command = `ssh-keygen -t rsa -b 4096 -C "${comment}" -f ${location} -N "${passphrase}"`;

  const { stdout, stderr } = await execAsync(command);

  if (stderr) {
    throw new Error(stderr);
  }

  console.log(stdout);
}

export async function saveSSHKeyPair(username: string) {
  await generateSSHKeyPair(username);

  const privateKey = await fs.readFile(`/tmp/${username}_id_rsa`);
  const publicKey = await fs.readFile(`/tmp/${username}_id_rsa.pub`);

  db[username] = {
    publicKey: publicKey.toString(),
    privateKey: privateKey.toString(),
  };

  return publicKey;
}

export function getSSHKeys(username: string) {
  return db[username];
}

export async function copyPublicKeyToServer(
  username: string,
  password: string,
) {
  const comment = `${username}@annotat3d`;
  const keys = getSSHKeys(username);
  const publicKey = keys?.publicKey;

  if (!publicKey) {
    throw new Error("No key found for user");
  }

  const connection = await ssh.connect({
    host: env.SSH_HOST,
    username,
    password,
  });

  const sftp = await connection.requestSFTP();

  // create directory if it doesn't exist
  await new Promise<void>((resolve, reject) => {
    sftp.mkdir(".ssh", (err) => {
      if (err && isErrnoException(err) && err.code !== "EEXIST") {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  // get existing authorized_keys
  const existingAuthorizedKeys = await new Promise<string>(
    (resolve, reject) => {
      sftp.readFile(".ssh/authorized_keys", (err, data) => {
        if (err) {
          if (isErrnoException(err) && err.code === "ENOENT") {
            resolve("");
          } else {
            reject(err);
          }
        } else {
          resolve(data.toString());
        }
      });
    },
  );

  // filter out existing key
  const existingKeys = existingAuthorizedKeys
    .split("\n")
    .filter((line) => !line.includes(comment));

  // append new key
  const newAuthorizedKeys = [...existingKeys, publicKey].join("\n");

  // write new authorized_keys
  await new Promise<void>((resolve, reject) => {
    sftp.writeFile(".ssh/authorized_keys", newAuthorizedKeys, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  sftp.end();
  connection.dispose();

  console.log("Public key copied to server");
  return publicKey;
}

function isErrnoException(error: unknown) {
  return error instanceof Error && "code" in error && "errno" in error;
}
