export const getKeys = <T extends {}>(o: T): Array<keyof T> =>
  o ? (Object.keys(o) as Array<keyof T>) : [];
