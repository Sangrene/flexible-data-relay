export interface EntityPersistenceHandler {
  getEntity: <T>(entityName: string, id: string) => Promise<T>;
  getEntityList: <T>(entityName: string, query: string) => Promise<T[]>;
}
