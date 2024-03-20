import { MatchStrategyInterface } from './strategy/match-strategy-interface';
import { EqualMatchStrategy } from './strategy/equal-match-strategy';

export class LcsService {
    protected matchStrategy: MatchStrategyInterface;

    constructor(matchStrategy: MatchStrategyInterface | null = null) {
        if (matchStrategy === null) {
            matchStrategy = new EqualMatchStrategy();
        }

        this.matchStrategy = matchStrategy!;
    }

    public longestCommonSubsequence(a: string[], b: string[]): number[] {
        const c: number[][] = [];

        const m = a.length;
        const n = b.length;

        for (let i = 0; i <= m; i++) {
            c[i] = [0];
        }

        for (let j = 0; j <= n; j++) {
            c[0][j] = 0;
        }

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (this.matchStrategy.isMatch(a[i - 1], b[j - 1])) {
                    c[i][j] = 1 + (c[i - 1]?.[j - 1] ?? 0);
                } else {
                    c[i][j] = Math.max(c[i]?.[j - 1] ?? 0, c[i - 1]?.[j] ?? 0);
                }
            }
        }

        const lcs = (new Array(m + 1) as number[]).fill(0);
        this.compileMatches(c, a, b, m, n, lcs);

        return lcs;
    }

    protected compileMatches(c: number[][], a: string[], b: string[], i: number, j: number, matches: number[]): void {
        if (i > 0 && j > 0 && this.matchStrategy.isMatch(a[i - 1], b[j - 1])) {
            this.compileMatches(c, a, b, i - 1, j - 1, matches);
            matches[i] = j;
        } else if (j > 0 && (i === 0 || c[i][j - 1] >= c[i - 1][j])) {
            this.compileMatches(c, a, b, i, j - 1, matches);
        } else if (i > 0 && (j === 0 || c[i][j - 1] < c[i - 1][j])) {
            this.compileMatches(c, a, b, i - 1, j, matches);
        }
    }
}
