export interface MessageBrokerPort {
    publish(topic: string, payload: any): void;
    subscribe(topic: string, handler: (payload: any, progress: (data: any) => void) => Promise<any>): void;
    request(topic: string, payload: any, onProgress?: (data: any) => void): Promise<any>;
}