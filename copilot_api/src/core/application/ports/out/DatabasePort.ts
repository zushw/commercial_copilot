export interface DatabasePort {
    executeReadQuery(sqlQuery: string): Promise<any[]>;
    getSchemaDefinition(): Promise<string>;
}