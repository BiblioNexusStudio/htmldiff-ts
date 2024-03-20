import { StringUtil } from './util/string-util';
export declare class Preprocessor {
    static diffCommonPrefix(old: string, newString: string, stringUtil: StringUtil): number;
    static diffCommonSuffix(old: string, newString: string, stringUtil: StringUtil): number;
    private static substr_compare;
}
