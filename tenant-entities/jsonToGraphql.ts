import { formatSdl } from "npm:format-graphql";

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
