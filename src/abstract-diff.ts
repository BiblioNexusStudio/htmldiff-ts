import { HtmlDiffConfig } from './html-diff-config';
import { StringUtil } from './util/string-util';

export class AbstractDiff {
    protected config: HtmlDiffConfig;
    protected content: string;
    protected oldText: string;
    protected newText: string;
    protected oldWords: string[] = [];
    protected newWords: string[] = [];
    protected stringUtil: StringUtil;

    constructor(oldText: string, newText: string, encoding: string = 'UTF-8', groupDiffs: boolean | null = null) {
        this.stringUtil = new StringUtil();

        this.config = HtmlDiffConfig.create().setEncoding(encoding);

        if (groupDiffs !== null) {
            this.config.setGroupDiffs(groupDiffs);
        }

        this.oldText = oldText;
        this.newText = newText;
        this.content = '';
    }

    getConfig(): HtmlDiffConfig {
        return this.config;
    }

    setConfig(config: HtmlDiffConfig): AbstractDiff {
        this.config = config;

        return this;
    }

    protected splitInputsToWords(): void {
        this.setOldWords(this.convertHtmlToListOfWords(this.oldText));
        this.setNewWords(this.convertHtmlToListOfWords(this.newText));
    }

    protected setOldWords(oldWords: string[]): void {
        this.oldWords = oldWords;
    }

    protected setNewWords(newWords: string[]): void {
        this.newWords = newWords;
    }

    protected convertHtmlToListOfWords(text: string): string[] {
        const words: string[] = [];

        let specialCharacters = '';

        for (const char of this.config.getSpecialCaseChars()) {
            specialCharacters += ([',', "'"].includes(char) ? '' : '\\') + char;
        }

        // Normalize no-break-spaces to regular spaces
        text = text.replace('\xc2\xa0', ' ');

        text.match(/<.+?>|[^<]+/gmu)?.forEach((sentenceOrHtmlTag) => {
            if (sentenceOrHtmlTag === '') {
                return;
            }

            if (sentenceOrHtmlTag[0] === '<') {
                words.push(sentenceOrHtmlTag);
                return;
            }

            sentenceOrHtmlTag = this.normalizeWhitespaceInHtmlSentence(sentenceOrHtmlTag);

            const sentenceSplitIntoWords: string[] = [];

            const regex = new RegExp(
                '\\s|[' + specialCharacters + '|[a-zA-Z0-9' + specialCharacters + '\\p{L}]+[a-zA-Z0-9\\p{L}]|[^\\s]',
                'gmu'
            );

            (sentenceOrHtmlTag + ' ').match(regex)?.forEach((word) => {
                sentenceSplitIntoWords.push(word);
            });

            // Remove the last space, since that was added by us for the regex matcher
            sentenceSplitIntoWords.pop();

            words.push(...sentenceSplitIntoWords);
        });

        return words;
    }

    protected normalizeWhitespaceInHtmlSentence(sentence: string): string {
        if (this.config.isKeepNewLines() === true) {
            return sentence;
        }

        sentence = sentence.replace(/\s\s+|\r+|\n+|\r\n+/g, ' ');

        const sentenceLength = this.stringUtil.strlen(sentence);
        const firstCharacter = this.stringUtil.substr(sentence, 0, 1);
        const lastCharacter = this.stringUtil.substr(sentence, sentenceLength - 1, 1);

        if (firstCharacter === ' ' || firstCharacter === '\r' || firstCharacter === '\n') {
            sentence = ' ' + sentence.trimStart();
        }

        if (sentenceLength > 1 && (lastCharacter === ' ' || lastCharacter === '\r' || lastCharacter === '\n')) {
            sentence = sentence.trimEnd() + ' ';
        }

        return sentence;
    }
}
