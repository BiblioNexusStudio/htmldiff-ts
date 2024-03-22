import { AbstractDiff } from './abstract-diff';
import { HtmlDiffConfig } from './html-diff-config';
import { Operation } from './operation';
import { MatchingBlock } from './matching-block';
export default class HtmlDiff extends AbstractDiff {
    protected wordIndices: Map<string, number[]>;
    protected newIsolatedDiffTags: {
        [key: number]: string[];
    };
    protected oldIsolatedDiffTags: {
        [key: number]: string[];
    };
    protected justProcessedDeleteFromIndex: number;
    protected regularOrStrippedWordCache: Map<string, string>;
    protected oldTextIsOnlyWhitespaceCache: Map<number, number>;
    static create(oldText: string, newText: string, config?: HtmlDiffConfig | null): HtmlDiff;
    setInsertSpaceInReplace(boolean: boolean): HtmlDiff;
    getInsertSpaceInReplace(): boolean;
    build(): string;
    protected indexNewWords(): void;
    protected replaceIsolatedDiffTags(): void;
    protected createIsolatedDiffTagPlaceholders(words: string[]): {
        [key: number]: string[];
    };
    protected isOpeningIsolatedDiffTag(item: string, currentIsolatedDiffTag?: string | null): string | false;
    protected isSelfClosingTag(text: string): boolean;
    protected isClosingIsolatedDiffTag(item: string, currentIsolatedDiffTag?: string | null): string | false;
    protected performOperation(operation: Operation): void;
    protected processReplaceOperation(operation: Operation): void;
    protected processInsertOperation(operation: Operation, cssClass: string): void;
    protected processDeleteOperation(operation: Operation, cssClass: string): void;
    protected diffIsolatedPlaceholder(operation: Operation, pos: number, placeholder: string, stripWrappingTags?: boolean): string;
    protected diffElements(oldText: string, newText: string, stripWrappingTags?: boolean): string;
    protected diffPicture(oldText: string, newText: string): string;
    protected diffElementsByAttribute(oldText: string, newText: string, attribute: string, element: string): string;
    protected processEqualOperation(operation: Operation): void;
    protected replaceParagraphSymbolWithBreaksIfNeeded(): void;
    protected getAttributeFromTag(text: string, attribute: string): string | null;
    protected isLinkPlaceholder(text: string): boolean;
    protected isImagePlaceholder(text: string): boolean;
    protected isPicturePlaceholder(text: string): boolean;
    protected isPlaceholderType(text: string, types: string | string[]): boolean;
    protected findIsolatedDiffTagsInOld(operation: Operation, posInNew: number): string[];
    protected insertTag(tag: string, cssClass: string, words: string[]): void;
    protected checkCondition(word: string, condition: string): boolean;
    protected wrapText(text: string, tagName: string, cssClass: string): string;
    protected extractConsecutiveWords(words: string[], condition: string): string[];
    protected isTag(item: string): boolean;
    protected isOpeningTag(item: string): boolean;
    protected isClosingTag(item: string): boolean;
    protected operations(): Operation[];
    protected getAction(matchStartsAtCurrentPositionInOld: boolean, matchStartsAtCurrentPositionInNew: boolean): string;
    protected matchingBlocks(): MatchingBlock[];
    protected findMatchingBlocks(startInOld: number, endInOld: number, startInNew: number, endInNew: number, matchingBlocks: MatchingBlock[]): void;
    protected stripTagAttributes(word: string): string;
    protected findMatch(startInOld: number, endInOld: number, startInNew: number, endInNew: number): MatchingBlock | null;
    protected oldTextIsOnlyWhitespace(startingAtWord: number, wordCount: number): boolean;
    private htmlspecialcharsDecode;
}
