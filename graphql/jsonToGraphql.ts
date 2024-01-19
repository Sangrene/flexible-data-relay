import { formatSdl } from "npm:format-graphql";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
} from "graphql";
import { JSONSchema7 } from "../json-schema/jsonSchemaTypes.ts";
import { EntityCore } from "../entities/entity.core.ts";

interface ObjMap<T> {
  [key: string]: T;
}
const isArray = (value: any): value is Array<any> => Array.isArray(value);
const isObject = (value: any) =>
  Object.prototype.toString.call(value) === "[object Object]";

const typeMapping = [
  {
    type: "ID",
    condition: (value: any) =>
      typeof value === "string" && value.toLowerCase() === "id",
  },
  { type: "String", condition: (value: any) => typeof value === "string" },
  { type: "Int", condition: (value: any) => Number.isInteger(value) },
  {
    type: "Float",
    condition: (value: any) => !isNaN(parseFloat(value)) && isFinite(value),
  },
  { type: "Date", condition: (value: any) => value instanceof Date },
  { type: "Boolean", condition: (value: any) => typeof value === "boolean" },
];

export const inferPrimitive = (value: any) => {
  for (let i = 0, n = typeMapping.length; i < n; i++) {
    const mappingItem = typeMapping[i];
    if (mappingItem.condition(value)) return mappingItem.type;
  }
  return undefined;
};

const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const jsonToGraphql = (
  name: string,
  json: Record<string, any>
): string => {
  const newEntityList: string[] = [];
  let graphqlType = `
  type ${capitalizeFirstLetter(name)} {${Object.keys(json).reduce(
    (acc, key) => {
      const value = json[key];
      if (isObject(value)) {
        const newEntityName = capitalizeFirstLetter(key);
        const type = jsonToGraphql(newEntityName, value);
        newEntityList.push(type);
        return `${acc}
        ${key}: ${newEntityName}`;
      } else if (isArray(value)) {
        if (value.length === 0)
          return `${acc}
        ${key}: [GenericScalar]`;

        if (inferPrimitive(value[0]))
          return `${acc}
        ${key}: [${inferPrimitive(value[0])}]`;
        const newEntityName = capitalizeFirstLetter(key);
        const newFields = Object.entries(
          value.reduce((acc, item) => {
            const itemKeys = Object.keys(item);
            for (let i = 0, n = itemKeys.length; i < n; i++) {
              const subKey = itemKeys[i];
              const subItemValue = item[subKey];
              acc[subKey] = inferPrimitive(subItemValue);
            }
            return acc;
          }, {})
        ).reduce(
          (acc, [subKey, subType]) => `${acc}
        ${subKey}: ${subType}`,
          ""
        );
        newEntityList.push(`type ${newEntityName} {${newFields}
      }`);
        return `${acc}
        ${key}: [${newEntityName}]`;
      } else {
        return `${acc}
        ${key}: ${inferPrimitive(value) || "GenericScalar"}`;
      }
    },
    ""
  )}
  }
  `;
  newEntityList.forEach((type: string) => {
    graphqlType += `\n${type}`;
  });
  const formattedGraphQl = formatSdl(graphqlType);
  return formattedGraphQl;
};

const jsonSchemaTypeMapping = {
  string: GraphQLString,
  number: GraphQLFloat,
  integer: GraphQLInt,
  boolean: GraphQLBoolean,
  date: GraphQLString,
} as const;

export const computeRecursiveGraphQlObjectType = (
  name: string,
  schema: JSONSchema7
): GraphQLObjectType | GraphQLScalarType | GraphQLList<any> => {
  if (!schema.type) return new GraphQLScalarType({ name: "UnknownType" });
  if (schema.type === "object") {
    return new GraphQLObjectType({
      name: capitalizeFirstLetter(name) + "Type",
      fields: Object.keys(schema.properties!).reduce((acc, propName) => {
        const propValue = schema.properties![propName];

        return {
          ...acc,
          [propName]: {
            type: computeRecursiveGraphQlObjectType(propName, propValue),
          },
        };
      }, {}),
    });
  }
  if (schema.type === "array") {
    const arrayType = schema.items?.type;
    if (!arrayType)
      return new GraphQLList(new GraphQLScalarType({ name: "UnknownType" }));
    if (arrayType === "null")
      return new GraphQLList(new GraphQLScalarType({ name: "UnknownType" }));
    if (arrayType === "object") {
      return new GraphQLList(
        computeRecursiveGraphQlObjectType(name, schema.items!)
      );
    }
    if (arrayType === "array") {
      return new GraphQLList(new GraphQLScalarType({ name: "UnknownType" }));
    }

    return new GraphQLList(jsonSchemaTypeMapping[arrayType]);
  }
  if (schema.type === "null")
    return new GraphQLScalarType({ name: "UnknownType" });
  if (schema.type === "string" && name.toLocaleLowerCase() === "id") {
    return GraphQLID;
  }
  return jsonSchemaTypeMapping[schema.type];
};

export const createGraphqlSchemaFromEntitiesSchema = (
  tenant: string,
  entitiesSchema: { schema: JSONSchema7; name: string }[],
  entityCore: EntityCore
) => {
  const fields = entitiesSchema.reduce<
    ObjMap<GraphQLFieldConfig<any, any, any>>
  >((acc, entity) => {
    const field: GraphQLFieldConfig<any, any, any> = {
      type: computeRecursiveGraphQlObjectType(
        entity.name,
        entity.schema
      ) as GraphQLObjectType,
      args: {
        id: {
          description: "Entity id",
          type: new GraphQLNonNull(GraphQLString),
        },
      },
      resolve: (_source, { id }) =>
        entityCore.getEntityById({ tenant, entityName: entity.name, id }),
    };

    // const fieldList: GraphQLFieldConfig<any, any, any> = {
    //   type: new GraphQLList(computeRecursiveGraphQlObjectType(
    //     entity.name,
    //     entity.schema
    //   ) as GraphQLObjectType),
    //   args: {
    //     query: {
    //       description: "MongoDB query string",
    //       type: new GraphQLNonNull(GraphQLString),
    //     },
    //   },
    //   resolve: (_source, { query }) =>
    //     handler.getEntityList({ tenant, entityName: entity.name, query }),
    // };
    // return { ...acc, [entity.name]: field, [`${entity.name}List`]: fieldList };
    return { ...acc, [entity.name]: field };
  }, {});
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: "Query",
      fields: { ...fields },
    }),
  });
  return schema;
};
