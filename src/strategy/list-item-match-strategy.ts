import { MatchStrategyInterface } from "./match-strategy-interface";
import { StringUtil } from "../util/string-util";
import { Preprocessor } from "../preprocessor";
import striptags from "striptags";

export class ListItemMatchStrategy implements MatchStrategyInterface {
  protected stringUtil: StringUtil;
  protected similarityThreshold: number;
  protected lengthRatioThreshold: number;
  protected commonTextRatioThreshold: number;

  constructor(
    stringUtil: StringUtil,
    similarityThreshold: number = 80,
    lengthRatioThreshold: number = 0.1,
    commonTextRatioThreshold: number = 0.6,
  ) {
    this.stringUtil = stringUtil;
    this.similarityThreshold = similarityThreshold;
    this.lengthRatioThreshold = lengthRatioThreshold;
    this.commonTextRatioThreshold = commonTextRatioThreshold;
  }

  public isMatch(a: string, b: string): boolean {
    let percentage: number | null = null;

    // Strip tags and check similarity
    const aStripped = striptags(a);
    const bStripped = striptags(b);
    percentage = this.similarText(aStripped, bStripped);

    if (percentage >= this.similarityThreshold) {
      return true;
    }

    // Check w/o stripped tags
    percentage = this.similarText(a, b);
    if (percentage >= this.similarityThreshold) {
      return true;
    }

    // Check common prefix/suffix length
    let aCleaned = aStripped.trim();
    let bCleaned = bStripped.trim();
    if (
      this.stringUtil.strlen(aCleaned) === 0 ||
      this.stringUtil.strlen(bCleaned) === 0
    ) {
      aCleaned = a;
      bCleaned = b;
    }
    if (
      this.stringUtil.strlen(aCleaned) === 0 ||
      this.stringUtil.strlen(bCleaned) === 0
    ) {
      return false;
    }
    const prefixIndex = Preprocessor.diffCommonPrefix(
      aCleaned,
      bCleaned,
      this.stringUtil,
    );
    const suffixIndex = Preprocessor.diffCommonSuffix(
      aCleaned,
      bCleaned,
      this.stringUtil,
    );

    // Use shorter string, and see how much of it is leftover
    const len = Math.min(
      this.stringUtil.strlen(aCleaned),
      this.stringUtil.strlen(bCleaned),
    );
    const remaining = len - (prefixIndex + suffixIndex);
    const strLengthPercent =
      len / Math.max(this.stringUtil.strlen(a), this.stringUtil.strlen(b));

    if (remaining === 0 && strLengthPercent > this.lengthRatioThreshold) {
      return true;
    }

    const percentCommon = (prefixIndex + suffixIndex) / len;

    if (
      strLengthPercent > 0.1 &&
      percentCommon > this.commonTextRatioThreshold
    ) {
      return true;
    }

    return false;
  }

  private similarText(first: string, second: string) {
    if (
      first === null ||
      second === null ||
      typeof first === "undefined" ||
      typeof second === "undefined"
    ) {
      return 0;
    }
    first += "";
    second += "";
    let pos1 = 0;
    let pos2 = 0;
    let max = 0;
    const firstLength = first.length;
    const secondLength = second.length;
    let p;
    let q;
    let l;
    let sum;
    for (p = 0; p < firstLength; p++) {
      for (q = 0; q < secondLength; q++) {
        for (
          l = 0;
          p + l < firstLength &&
          q + l < secondLength &&
          first.charAt(p + l) === second.charAt(q + l);
          l++
        ) {
          // eslint-disable-line max-len
          // @todo: ^-- break up this crazy for loop and put the logic in its body
        }
        if (l > max) {
          max = l;
          pos1 = p;
          pos2 = q;
        }
      }
    }
    sum = max;
    if (sum) {
      if (pos1 && pos2) {
        sum += this.similarText(first.substr(0, pos1), second.substr(0, pos2));
      }
      if (pos1 + max < firstLength && pos2 + max < secondLength) {
        sum += this.similarText(
          first.substr(pos1 + max, firstLength - pos1 - max),
          second.substr(pos2 + max, secondLength - pos2 - max),
        );
      }
    }
    return (sum * 200) / (firstLength + secondLength);
  }
}
