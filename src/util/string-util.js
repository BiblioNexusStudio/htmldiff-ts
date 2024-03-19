"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringUtil = void 0;
class StringUtil {
    constructor() {
        // No need for any initialization
    }
    strlen(str) {
        return str.length;
    }
    strpos(haystack, needle, offset = 0) {
        return haystack.indexOf(needle, offset);
    }
    stripos(haystack, needle, offset = 0) {
        return haystack.toLowerCase().indexOf(needle.toLowerCase(), offset);
    }
    substr(str, start, length = null) {
        return str.substr(start, length ?? undefined);
    }
}
exports.StringUtil = StringUtil;
