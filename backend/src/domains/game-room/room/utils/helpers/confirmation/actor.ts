import { IVoteJSON, IVoteOption } from "./types.js";

export class ConfirmActor {
    private id: string;

    private name: string;
    private description: string;
    private duration: number;
    private options: IVoteOption[];

    private timeout?: NodeJS.Timeout;

    private votes: { [key: string]: string } = {};
    private allowedVoters: string[];

    public readonly onCloseListeners: ((ctx: IVoteJSON) => void)[] = [];
    constructor(id: string, name: string, description: string, options: IVoteOption[], duration: number, allowedVoters: string[]) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.duration = duration;
        this.options = options;
        this.allowedVoters = allowedVoters;
    }

    public start() {
        this.startedAt = Date.now();
        this.timeout = setTimeout(() => {
            this.close();
        }, this.duration);
    }

    public vote(voterId: string, optionId: string): boolean {
        if (!this.allowedVoters.includes(voterId)) {
            return false;
        }
        if (!this.options.find((option) => option.id === optionId)) {
            return false;
        }
        this.votes[voterId] = optionId;
        return true;
    }

    public close() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.onCloseListeners.forEach((listener) => listener(this.JSON));
    }


    private startedAt: number = 0;

    public get JSON(): IVoteJSON {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            options: this.options,
            votes: this.votes,
            duration: this.duration,
            deadlineAt: this.startedAt + this.duration,
        }
    }
}