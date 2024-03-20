import { MatchStrategyInterface } from './match-strategy-interface';
export declare class EqualMatchStrategy implements MatchStrategyInterface {
    isMatch(a: string, b: string): boolean;
}
