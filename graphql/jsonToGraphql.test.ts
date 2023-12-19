import { assertEquals } from "https://deno.land/std@0.209.0/assert/mod.ts";
import {
  jsonToGraphql,
  computeRecursiveGraphQlObjectType,
} from "./jsonToGraphql.ts";
import { formatSdl } from "npm:format-graphql";
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLList,
} from "graphql";
import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";

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

Deno.test(function computeRecursiveGraphQlObjectTypeTest() {
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
  const objectType = new GraphQLObjectType({
    name: "JsonType",
    fields: {
      id: {
        type: GraphQLID,
      },
      a: {
        type: GraphQLString,
      },
      b: {
        type: GraphQLInt,
      },
      c: {
        type: GraphQLString,
      },
      d: {
        type: GraphQLFloat,
      },
      arrayOfInt: {
        type: new GraphQLList(GraphQLInt),
      },
      arrayOfObject: {
        type: new GraphQLList(
          new GraphQLObjectType({
            name: "ArrayOfObjectType",
            fields: {
              a: {
                type: GraphQLString,
              },
              b: {
                type: GraphQLInt,
              },
              c: {
                type: GraphQLFloat,
              },
            },
          })
        ),
      },
      object: {
        type: new GraphQLObjectType({
          name: "ObjectType",
          fields: {
            a: {
              type: GraphQLString,
            },
          },
        }),
      },
    },
  });
  const result = computeRecursiveGraphQlObjectType(
    "Json",
    jsonSchema
  ) as GraphQLObjectType;
  assertEquals(JSON.stringify(result.toConfig()), JSON.stringify(objectType.toConfig()));
});
