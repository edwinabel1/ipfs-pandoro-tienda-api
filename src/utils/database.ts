// src/utils/database.ts
export class DB {
  static getInstance(env: any): any {
    if (!env.DB) {
      throw new Error("D1 database binding 'DB' is not defined");
    }
    return env.DB;
  }
}
