"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListItemMatchStrategy = void 0;
const preprocessor_1 = require("../preprocessor");
const striptags_1 = __importDefault(require("striptags"));
class ListItemMatchStrategy {
    stringUtil;
    similarityThreshold;
    lengthRatioThreshold;
    commonTextRatioThreshold;
    constructor(stringUtil, similarityThreshold = 80, lengthRatioThreshold = 0.1, commonTextRatioThreshold = 0.6) {
        this.stringUtil = stringUtil;
        this.similarityThreshold = similarityThreshold;
        this.lengthRatioThreshold = lengthRatioThreshold;
        this.commonTextRatioThreshold = commonTextRatioThreshold;
    }
    isMatch(a, b) {
        let percentage = null;
        // Strip tags and check similarity
        const aStripped = (0, striptags_1.default)(a);
        const bStripped = (0, striptags_1.default)(b);
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
        if (this.stringUtil.strlen(aCleaned) === 0 ||
            this.stringUtil.strlen(bCleaned) === 0) {
            aCleaned = a;
            bCleaned = b;
        }
        if (this.stringUtil.strlen(aCleaned) === 0 ||
            this.stringUtil.strlen(bCleaned) === 0) {
            return false;
        }
        const prefixIndex = preprocessor_1.Preprocessor.diffCommonPrefix(aCleaned, bCleaned, this.stringUtil);
        const suffixIndex = preprocessor_1.Preprocessor.diffCommonSuffix(aCleaned, bCleaned, this.stringUtil);
        // Use shorter string, and see how much of it is leftover
        const len = Math.min(this.stringUtil.strlen(aCleaned), this.stringUtil.strlen(bCleaned));
        const remaining = len - (prefixIndex + suffixIndex);
        const strLengthPercent = len / Math.max(this.stringUtil.strlen(a), this.stringUtil.strlen(b));
        if (remaining === 0 && strLengthPercent > this.lengthRatioThreshold) {
            return true;
        }
        const percentCommon = (prefixIndex + suffixIndex) / len;
        if (strLengthPercent > 0.1 &&
            percentCommon > this.commonTextRatioThreshold) {
            return true;
        }
        return false;
    }
    similarText(first, second) {
        if (first === null ||
            second === null ||
            typeof first === "undefined" ||
            typeof second === "undefined") {
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
                for (l = 0; p + l < firstLength &&
                    q + l < secondLength &&
                    first.charAt(p + l) === second.charAt(q + l); l++) {
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
                sum += this.similarText(first.substr(pos1 + max, firstLength - pos1 - max), second.substr(pos2 + max, secondLength - pos2 - max));
            }
        }
        return (sum * 200) / (firstLength + secondLength);
    }
}
exports.ListItemMatchStrategy = ListItemMatchStrategy;
