import crypto from "node:crypto";
export class MulberryRNG {
    private state: number;

    constructor(seed: number) {
        this.state = seed;
    }

    private next(): number {
        let t = (this.state += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    static fromSeed(seed: string) {
        let h = 0x811c9dc5;
        for (let i = 0; i < seed.length; i++) {
            h ^= seed.charCodeAt(i);
            h = Math.imul(h, 0x1000193);
        }
        return new MulberryRNG(h);
    }

    static fromRandom() {
        return new MulberryRNG(Math.floor(crypto.randomBytes(4).readUInt32LE(0)));
    }

    public roll(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    public pick<T>(array: readonly T[]): T {
        if (array.length === 0) {
            throw new Error("MulberryRNG.pick: cannot pick from an empty array");
        }

        return array[Math.floor(this.next() * array.length)]!;
    }

    public chance(probability: number): boolean {
        return this.next() < probability;
    }
}