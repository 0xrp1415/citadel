export interface IVoteOption {
    readonly id: string;
    readonly name: string;
    readonly description: string;
}
export interface IVoteJSON {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly options: IVoteOption[];
    readonly votes: { [key: string]: string };
    readonly duration: number;
    readonly deadlineAt: number;
}