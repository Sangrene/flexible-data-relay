import { assertEquals } from "https://deno.land/std@0.209.0/assert/mod.ts";
import { jsonToJsonSchema } from "./jsonToJsonSchema.ts";
import { JSONSchema7 } from "./jsonSchemaTypes.ts";

Deno.test(function jsonToGraphqTestl() {
  const jsonToTest = {
    id: "id",
    a: "yes",
    b: 1,
    c: new Date(),
    d: 1.2,
    arrayOfInt: [1, 2, 3, 4],
    arrayOfObject: [
      {
        a: "arrayYes",
        b: 1,
      },
      {
        a: "arrayNo",
        b: 2.3,
      },
    ],
    object: {
      a: "objectYes",
    },
  };
  const jsonSchema: JSONSchema7 = {
    type: "object",
    properties: {
      id: {
        type: "string",
      },
      a: {
        type: "string",
      },
      b: {
        type: "integer",
      },
      c: {
        type: "date",
      },
      d: {
        type: "number",
      },
      arrayOfInt: {
        type: "array",
        items: {
          type: "integer",
        },
      },
      arrayOfObject: {
        type: "array",
        items: {
          type: "object",
          properties: {
            a: {
              type: "string",
            },
            b: {
              type: "number",
            },
          },
        },
      },
      object: {
        type: "object",
        properties: {
          a: {
            type: "string",
          },
        },
      },
    },
  };
  assertEquals(jsonToJsonSchema(jsonToTest), jsonSchema);
});
