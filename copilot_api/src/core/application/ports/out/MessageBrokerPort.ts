export interface MessageBrokerPort {
    publish(topic: string, payload: any): void;
    subscribe(topic: string, handler: (payload: any) => Promise<any>): void;
    request(topic: string, payload: any): Promise<any>;
}