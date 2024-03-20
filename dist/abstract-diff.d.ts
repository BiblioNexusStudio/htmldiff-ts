import { HtmlDiffConfig } from './html-diff-config';
import { StringUtil } from './util/string-util';
export declare class AbstractDiff {
    protected config: HtmlDiffConfig;
    protected content: string;
    protected oldText: string;
    protected newText: string;
    protected oldWords: string[];
    protected newWords: string[];
    protected stringUtil: StringUtil;
    constructor(oldText: string, newText: string, encoding?: string, groupDiffs?: boolean | null);
    getConfig(): HtmlDiffConfig;
    setConfig(config: HtmlDiffConfig): AbstractDiff;
    protected splitInputsToWords(): void;
    protected setOldWords(oldWords: string[]): void;
    protected setNewWords(newWords: string[]): void;
    protected convertHtmlToListOfWords(text: string): string[];
    protected normalizeWhitespaceInHtmlSentence(sentence: string): string;
}
