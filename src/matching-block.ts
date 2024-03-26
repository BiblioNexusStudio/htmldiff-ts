export class MatchingBlock {
    startInOld: number;
    startInNew: number;
    size: number;

    constructor(startInOld: number, startInNew: number, size: number) {
        this.startInOld = startInOld;
        this.startInNew = startInNew;
        this.size = size;
    }

    endInOld(): number {
        return this.startInOld + this.size;
    }

    endInNew(): number {
        return this.startInNew + this.size;
    }

    count(): number {
        return this.size;
    }
}
