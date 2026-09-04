import { ConfirmActor } from "./actor.js";
import crypto from "node:crypto";

export class ConfirmationManager {
    private static instance: ConfirmationManager;

    public votes: { [key: string]: ConfirmActor } = {};

    public static get Instance() {
        if (!this.instance) {
            this.instance = new ConfirmationManager();
        }
        return this.instance;
    }

    public createConfirmation(name: string, description: string, options: { id: string, name: string, description: string }[], duration: number, allowedVoters: string[]): ConfirmActor {
        let actorId = crypto.randomUUID();

        let confirmActor = new ConfirmActor(actorId, name, description, options, duration, allowedVoters);
        confirmActor.onCloseListeners.push((votes) => {
            this.removeConfirmation(actorId);
        });
        this.votes[actorId] = confirmActor;
        return confirmActor;
    }

    public getConfirmation(id: string): ConfirmActor | undefined {
        return this.votes[id];
    }

    public removeConfirmation(id: string): boolean {
        if (this.votes[id]) {
            delete this.votes[id];
            return true;
        }
        return false;
    }
}