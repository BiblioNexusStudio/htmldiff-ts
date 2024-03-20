export class MatchingBlock {
    public startInOld: number;
    public startInNew: number;
    public size: number;

    constructor(startInOld: number, startInNew: number, size: number) {
        this.startInOld = startInOld;
        this.startInNew = startInNew;
        this.size = size;
    }

    public endInOld(): number {
        return this.startInOld + this.size;
    }

    public endInNew(): number {
        return this.startInNew + this.size;
    }

    public count(): number {
        return this.size;
    }
}
