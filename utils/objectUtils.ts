export const getKeys = <T extends Record<string, any>>(o: T): Array<keyof T> =>
  o ? (Object.keys(o) as Array<keyof T>) : [];
