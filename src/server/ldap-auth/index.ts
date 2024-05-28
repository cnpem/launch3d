import { private_key, public_key, public_key_api } from "./keys";
import JSEncrypt from "jsencrypt";

type DictStr = Record<string, string>;

type DictEnumStr = Record<string, string[]>;

async function encrypt_request(login_data: DictStr, public_key_api: string) {
  const encrypted_data: DictEnumStr = {};
  const cipher = new JSEncrypt({
    default_key_size: "2048",
  });
  cipher.setPublicKey(public_key_api);
  Object.entries(login_data).map(([key, value]) => {
    const value_enc: string[] = [];
    const iterations: number = Math.ceil(value.length / 150);

    for (let it = 0; it < iterations; it++) {
      const it_pos = 150 * it;
      const substr: string = value.substring(it_pos, it_pos + 150);
      const encrypted_result = cipher.encrypt(substr);
      if (encrypted_result) {
        value_enc.push(encrypted_result);
      }
    }
    encrypted_data[key] = value_enc;
  });

  return encrypted_data;
}

async function decrypt_response(response_data: DictEnumStr) {
  const decrypted_data: DictStr = {};
  const cipher = new JSEncrypt({
    default_key_size: "2048",
  });
  cipher.setPrivateKey(private_key);
  Object.entries(response_data).map(([key, value_list]) => {
    let value_enc = "";
    decrypted_data[key] = "";
    value_list.map((value: string) => {
      const new_val = Buffer.from(value).toString("latin1");
      const encrypted_result = cipher.decrypt(new_val);
      if (encrypted_result) {
        value_enc = encrypted_result;
      }
      decrypted_data[key] += value_enc;
    });
  });
  return decrypted_data;
}

async function login_ldap(email: string, password: string) {
  const url = `https://ldap-auth-api.lnls.br`;
  const login_data = {
    email,
    password,
    public_key,
  };

  const encrypted = await encrypt_request(login_data, public_key_api);
  const encrypt_string = JSON.stringify(encrypted);
  const res = await fetch(url, {
    method: "POST",
    body: encrypt_string,
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data: unknown = await res.json();
  const decrypted_data = await decrypt_response(data as DictEnumStr);
  return decrypted_data;
}

export { login_ldap };
