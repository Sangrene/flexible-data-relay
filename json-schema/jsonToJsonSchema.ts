import toJsonSchema from "to-json-schema";
import { JSONSchema7 } from "./jsonSchemaTypes.ts";

export const jsonToJsonSchema = (json: any): JSONSchema7 => {
  return toJsonSchema(json, {
    strings: { detectFormat: true },
    arrays: { mode: "all" },
  });
};
