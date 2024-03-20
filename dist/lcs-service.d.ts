import { MatchStrategyInterface } from './strategy/match-strategy-interface';
export declare class LcsService {
    protected matchStrategy: MatchStrategyInterface;
    constructor(matchStrategy?: MatchStrategyInterface | null);
    longestCommonSubsequence(a: string[], b: string[]): number[];
    protected compileMatches(c: number[][], a: string[], b: string[], i: number, j: number, matches: number[]): void;
}
