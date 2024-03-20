export declare class HtmlDiffConfig {
    protected specialCaseChars: string[];
    protected groupDiffs: boolean;
    protected insertSpaceInReplace: boolean;
    protected keepNewLines: boolean;
    protected encoding: string;
    protected isolatedDiffTags: {
        [key: string]: string;
    };
    protected matchThreshold: number;
    protected spaceMatching: boolean;
    static create(): HtmlDiffConfig;
    constructor();
    getMatchThreshold(): number;
    setMatchThreshold(matchThreshold: number): HtmlDiffConfig;
    setSpecialCaseChars(chars: string[]): void;
    getSpecialCaseChars(): string[];
    addSpecialCaseChar(char: string): HtmlDiffConfig;
    removeSpecialCaseChar(char: string): HtmlDiffConfig;
    isGroupDiffs(): boolean;
    setGroupDiffs(groupDiffs: boolean): HtmlDiffConfig;
    getEncoding(): string;
    setEncoding(encoding: string): HtmlDiffConfig;
    isInsertSpaceInReplace(): boolean;
    setInsertSpaceInReplace(insertSpaceInReplace: boolean): HtmlDiffConfig;
    isKeepNewLines(): boolean;
    setKeepNewLines(keepNewLines: boolean): void;
    getIsolatedDiffTags(): {
        [key: string]: string;
    };
    setIsolatedDiffTags(isolatedDiffTags: {
        [key: string]: string;
    }): HtmlDiffConfig;
    addIsolatedDiffTag(tag: string, placeholder?: string | null): HtmlDiffConfig;
    removeIsolatedDiffTag(tag: string): HtmlDiffConfig;
    isIsolatedDiffTag(tag: string): boolean;
    isIsolatedDiffTagPlaceholder(text: string): boolean;
    getIsolatedDiffTagPlaceholder(tag: string): string | null;
    isSpaceMatching(): boolean;
    setSpaceMatching(spaceMatching: boolean): void;
    protected getOpeningTag(tag: string): RegExp;
    protected getClosingTag(tag: string): string;
}
