export declare class HtmlDiffConfig {
    keepNewLines: boolean;
    isolatedDiffTags: {
        [key: string]: string;
    };
    spaceMatching: boolean;
    static create(): HtmlDiffConfig;
    isKeepNewLines(): boolean;
    getIsolatedDiffTags(): {
        [key: string]: string;
    };
    isIsolatedDiffTag(tag: string): boolean;
    isIsolatedDiffTagPlaceholder(text: string): boolean;
    getIsolatedDiffTagPlaceholder(tag: string): string | null;
    isSpaceMatching(): boolean;
}
