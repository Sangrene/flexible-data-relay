import {
  create,
  verify,
  getNumericDate,
} from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import "https://deno.land/std@0.209.0/dotenv/load.ts";

const keyConfig: {
  algo: HmacImportParams;
  extractable: true;
  keyUsages: KeyUsage[];
} = {
  algo: { name: "HMAC", hash: "SHA-512" },
  extractable: true,
  keyUsages: ["sign", "verify"],
} as const;

const storedKey: JsonWebKey = {
  alg: "HS512",
  ext: true,
  k:
    Deno.env.get("AUTH_SECRET_KEY") ||
    "WGnzrQxmNpjDbXLw4b8g6JUq1-X4LtsyXgi9SslCrTRtAlNysQyC7_beT-AnB-sWJX60Rf-MqTt9-CrcN67IBXBZmH0QGL4Zqg6T_M6FQWuA43XNLErBeJsaaeDF3Jp1-m2-WRG4usPzzb6SSZ1H3CGZBBc6zi_5nfhLd7HX7j0",
  key_ops: ["sign", "verify"],
  kty: "oct",
};

const createJwtService = async () => {
  const key = await crypto.subtle.importKey(
    "jwk",
    storedKey,
    keyConfig.algo,
    keyConfig.extractable,
    keyConfig.keyUsages
  );

  const createJWT = async (payload: Record<string, string | number>) => {
    const jwt = await create(
      { alg: "HS512", typ: "JWT" },
      { ...payload, exp: getNumericDate(60 * 60 * 24 * 30) },
      key
    );
    return jwt;
  };

  const verifyJWT = async (token: string) => {
    return await verify(token, key);
  };

  return {
    createJWT,
    verifyJWT,
  };
};

export default createJwtService;
