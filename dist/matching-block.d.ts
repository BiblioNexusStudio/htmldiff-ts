export declare class MatchingBlock {
    startInOld: number;
    startInNew: number;
    size: number;
    constructor(startInOld: number, startInNew: number, size: number);
    endInOld(): number;
    endInNew(): number;
    count(): number;
}
