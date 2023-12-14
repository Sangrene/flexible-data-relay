import { assertEquals } from "https://deno.land/std@0.209.0/assert/mod.ts";
import { jsonToGraphql } from "./jsonToGraphql.ts";
import { formatSdl } from "npm:format-graphql";

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
        c: 2.3,
      },
    ],
    object: {
      a: "objectYes",
    },
  };
  const graphqlType = `
    type Json {
      id: ID
      a: String
      b: Int
      c: Date
      d: Float
      arrayOfInt: [Int]
      arrayOfObject: [ArrayOfObject]
      object: Object
    }

    type ArrayOfObject {
      a: String
      b: Int
      c: Float
    }

    type Object {
      a: String
    }
  `;
  assertEquals(jsonToGraphql("json", jsonToTest), formatSdl(graphqlType));
});
