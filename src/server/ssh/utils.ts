import { promisify } from "util";
import { generateKeyPair, createPublicKey } from "crypto";
import { ssh } from ".";
import { env } from "~/env";

const db: Record<string, { publicKey: string; privateKey: string }> = {};

const generateKeyPairAsync = promisify(generateKeyPair);

export async function generateSSHKeyPair(username: string) {
  const { publicKey, privateKey } = await generateKeyPairAsync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  const openSSHPublicKey = convertToOpenSSHFormat(publicKey, username);

  return {
    publicKey: openSSHPublicKey,
    privateKey,
  };
}

function convertToOpenSSHFormat(publicKey: string, username: string) {
  const publicKeyBuffer = createPublicKey(publicKey);
  const sshPublicKey = publicKeyBuffer.export({
    type: "spki",
    format: "pem",
  }) as string;

  const sshFormattedKey = sshPublicKey
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "");

  return `ssh-rsa ${sshFormattedKey} ${username}@annotat3d`;
}

export async function saveSSHKeyPair(username: string) {
  const { publicKey, privateKey } = await generateSSHKeyPair(username);

  db[username] = {
    publicKey,
    privateKey,
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
