import { StringUtil } from './util/string-util';

export class Preprocessor {
    public static diffCommonPrefix(old: string, newString: string, stringUtil: StringUtil): number {
        // Quick check for common null cases.
        if (
            stringUtil.strlen(old) === 0 ||
            stringUtil.strlen(newString) === 0 ||
            stringUtil.substr(old, 0, 1) !== stringUtil.substr(newString, 0, 1)
        ) {
            return 0;
        }

        // Binary Search
        let pointerMin = 0;
        let pointerMax = Math.min(stringUtil.strlen(old), stringUtil.strlen(newString));
        let pointerMid = pointerMax;
        let pointerStart = 0;
        while (pointerMin < pointerMid) {
            const cmp = this.substr_compare(
                old,
                stringUtil.substr(newString, pointerStart, pointerMid - pointerStart),
                pointerStart,
                pointerMid - pointerStart
            );
            if (cmp === 0) {
                pointerMin = pointerMid;
                pointerStart = pointerMin;
            } else {
                pointerMax = pointerMid;
            }
            pointerMid = Math.floor((pointerMax - pointerMin) / 2 + pointerMin);
        }
        return pointerMid;
    }

    public static diffCommonSuffix(old: string, newString: string, stringUtil: StringUtil): number {
        // Quick check for common null cases.
        if (
            stringUtil.strlen(old) === 0 ||
            stringUtil.strlen(newString) === 0 ||
            stringUtil.substr(old, stringUtil.strlen(old) - 1, 1) !==
                stringUtil.substr(newString, stringUtil.strlen(newString) - 1, 1)
        ) {
            return 0;
        }

        // Binary Search
        let pointerMin = 0;
        let pointerMax = Math.min(stringUtil.strlen(old), stringUtil.strlen(newString));
        let pointerMid = pointerMax;
        let pointerEnd = 0;
        const oldLen = stringUtil.strlen(old);
        const newLen = stringUtil.strlen(newString);
        while (pointerMin < pointerMid) {
            if (
                stringUtil.substr(old, oldLen - pointerMid, pointerMid - pointerEnd) ===
                stringUtil.substr(newString, newLen - pointerMid, pointerMid - pointerEnd)
            ) {
                pointerMin = pointerMid;
                pointerEnd = pointerMin;
            } else {
                pointerMax = pointerMid;
            }
            pointerMid = Math.floor((pointerMax - pointerMin) / 2 + pointerMin);
        }
        return pointerMid;
    }

    private static substr_compare(mainStr: string, str: string, offset: number, length: number): number {
        // Implement your own substr_compare function or use a library
        // For example, you can compare the substrings directly:
        return mainStr.substr(offset, length).localeCompare(str);
    }
}
