import { MatchStrategyInterface } from "./match-strategy-interface";

export class EqualMatchStrategy implements MatchStrategyInterface {
  public isMatch(a: string, b: string): boolean {
    return a === b;
  }
}
