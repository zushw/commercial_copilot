import EventEmitter from "node:events";
import { randomUUID } from "node:crypto";
import { MessageBrokerPort } from "../../../core/application/ports/out/MessageBrokerPort";
import { response } from "express";

export class InMemoryMessageBroker implements MessageBrokerPort {
    private bus = new EventEmitter();
    
    publish(topic: string, payload: any): void {
        this.bus.emit(topic, payload);
    }

    subscribe(topic: string, handler: (payload: any, progress: ( data: any) => void) => Promise<any>): void {
        this.bus.on(topic, async (data) => {
            const payload = data?.payload || data;
            const replyTo = data?.replyTo;
            const progressTopic = data?.progressTopic;

            const reportProgress = (progressData: any) => {
                if (progressTopic) this.bus.emit(progressTopic, progressData);
            };

            try {
                const result = await handler(payload, reportProgress)

                if (replyTo) {
                    this.bus.emit(replyTo, { success: true, result });
                }
            } catch (error: any) {
                console.error(`[Worker Error] Topic: ${topic} | Error:`, error.message);
                if (replyTo) {
                    this.bus.emit(replyTo, { success: false, error: error.message });
                }
            }
        });
    }

    request(topic: string, payload: any, onProgress?: (data: any) => void): Promise<any> {
        return new Promise((resolve, reject) => {
            const replyTo = `reply_${randomUUID}`;
            const progressTopic = `progress_${randomUUID()}`;

            if (onProgress) {
                this.bus.on(progressTopic, onProgress);
            }

            this.bus.once(replyTo, (response) => {
                this.bus.removeAllListeners(progressTopic);
                if (response.success) resolve(response.result);
                else reject(new Error(response.result));
            });

            this.bus.emit(topic, { payload, replyTo, progressTopic });
        });
    }
}