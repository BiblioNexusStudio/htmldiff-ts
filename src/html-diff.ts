import { HtmlDiffConfig } from './html-diff-config';
import { Operation } from './operation';
import { MatchingBlock } from './matching-block';

export default class HtmlDiff {
    wordIndices: Map<string, number[]> = new Map();
    newIsolatedDiffTags: { [key: number]: string[] } = {};
    oldIsolatedDiffTags: { [key: number]: string[] } = {};
    justProcessedDeleteFromIndex = -1;
    oldTextIsOnlyWhitespaceCache: Map<number, number> = new Map();
    config: HtmlDiffConfig;
    content: string;
    oldText: string;
    newText: string;
    oldWords: string[] = [];
    newWords: string[] = [];

    constructor(oldText: string, newText: string) {
        this.config = HtmlDiffConfig.create();
        this.oldText = oldText;
        this.newText = newText;
        this.content = '';
    }

    splitInputsToWords(): void {
        this.setOldWords(this.convertHtmlToListOfWords(this.oldText));
        this.setNewWords(this.convertHtmlToListOfWords(this.newText));
    }

    setOldWords(oldWords: string[]): void {
        this.oldWords = oldWords;
    }

    setNewWords(newWords: string[]): void {
        this.newWords = newWords;
    }

    convertHtmlToListOfWords(text: string): string[] {
        const words: string[] = [];

        // Normalize no-break-spaces to regular spaces
        text = text.replace('\xc2\xa0', ' ');

        text.match(/<.+?>|[^<]+/gmu)?.forEach((sentenceOrHtmlTag) => {
            if (sentenceOrHtmlTag === '') {
                return;
            }

            if (sentenceOrHtmlTag[0] === '<') {
                if (sentenceOrHtmlTag === '</p>') {
                    words.push(sentenceOrHtmlTag);
                    words.push('¶');
                } else {
                    words.push(sentenceOrHtmlTag);
                }
                return;
            }

            sentenceOrHtmlTag = this.normalizeWhitespaceInHtmlSentence(sentenceOrHtmlTag);

            const sentenceSplitIntoWords: string[] = [];

            const regex = new RegExp("\\s|[,.()']|[a-zA-Z0-9,.()'\\p{L}]+[a-zA-Z0-9\\p{L}]|[^\\s]", 'gmu');

            (sentenceOrHtmlTag + ' ').match(regex)?.forEach((word) => {
                sentenceSplitIntoWords.push(word);
            });

            // Remove the last space, since that was added by us for the regex matcher
            sentenceSplitIntoWords.pop();

            words.push(...sentenceSplitIntoWords);
        });

        return words;
    }

    normalizeWhitespaceInHtmlSentence(sentence: string): string {
        if (this.config.isKeepNewLines() === true) {
            return sentence;
        }

        sentence = sentence.replace(/\s\s+|\r+|\n+|\r\n+/g, ' ');

        const sentenceLength = sentence.length;
        const firstCharacter = sentence[0];
        const lastCharacter = sentence[sentenceLength - 1];

        if (firstCharacter === ' ' || firstCharacter === '\r' || firstCharacter === '\n') {
            sentence = ' ' + sentence.trimStart();
        }

        if (sentenceLength > 1 && (lastCharacter === ' ' || lastCharacter === '\r' || lastCharacter === '\n')) {
            sentence = sentence.trimEnd() + ' ';
        }

        return sentence;
    }

    static create(oldText: string, newText: string): HtmlDiff {
        return new HtmlDiff(oldText, newText);
    }

    build(): string {
        if (this.oldText === this.newText) {
            return this.newText;
        }

        this.splitInputsToWords();
        this.replaceIsolatedDiffTags();
        this.indexNewWords();

        const operations = this.operations();

        for (const item of operations) {
            this.performOperation(item);
        }

        this.replaceParagraphSymbolWithBreaksIfNeeded();

        return this.content;
    }

    indexNewWords(): void {
        this.wordIndices = new Map();

        for (let i = 0; i < this.newWords.length; i++) {
            let word = this.newWords[i];
            if (this.isTag(word)) {
                word = this.stripTagAttributes(word);
            }

            if (!this.wordIndices.has(word)) {
                this.wordIndices.set(word, []);
            }

            this.wordIndices.get(word)!.push(i);
        }
    }

    replaceIsolatedDiffTags() {
        this.oldIsolatedDiffTags = this.createIsolatedDiffTagPlaceholders(this.oldWords);
        this.newIsolatedDiffTags = this.createIsolatedDiffTagPlaceholders(this.newWords);
    }

    createIsolatedDiffTagPlaceholders(words: string[]): {
        [key: number]: string[];
    } {
        let openIsolatedDiffTags = 0;
        const isolatedDiffTagIndices: {
            start: number;
            length: number;
            tagType: string;
        }[] = [];
        let isolatedDiffTagStart = 0;
        let currentIsolatedDiffTag: string | null = null;

        for (let index = 0; index < words.length; index++) {
            const word = words[index];
            const openIsolatedDiffTag = this.isOpeningIsolatedDiffTag(word, currentIsolatedDiffTag);

            if (openIsolatedDiffTag) {
                if (this.isSelfClosingTag(word) || word.toLowerCase().includes('<img')) {
                    if (openIsolatedDiffTags === 0) {
                        isolatedDiffTagIndices.push({
                            start: index,
                            length: 1,
                            tagType: openIsolatedDiffTag,
                        });
                        currentIsolatedDiffTag = null;
                    }
                } else {
                    if (openIsolatedDiffTags === 0) {
                        isolatedDiffTagStart = index;
                    }
                    openIsolatedDiffTags++;
                    currentIsolatedDiffTag = openIsolatedDiffTag;
                }
            } else if (openIsolatedDiffTags > 0 && this.isClosingIsolatedDiffTag(word, currentIsolatedDiffTag)) {
                openIsolatedDiffTags--;
                if (openIsolatedDiffTags === 0) {
                    isolatedDiffTagIndices.push({
                        start: isolatedDiffTagStart,
                        length: index - isolatedDiffTagStart + 1,
                        tagType: currentIsolatedDiffTag!,
                    });
                    currentIsolatedDiffTag = null;
                }
            }
        }

        const isolatedDiffTagScript: { [key: number]: string[] } = {};
        let offset = 0;

        for (const isolatedDiffTagIndex of isolatedDiffTagIndices) {
            const start = isolatedDiffTagIndex.start - offset;
            const placeholderString = this.config.getIsolatedDiffTagPlaceholder(isolatedDiffTagIndex.tagType);
            if (placeholderString) {
                isolatedDiffTagScript[start] = words.splice(start, isolatedDiffTagIndex.length, placeholderString);
            } else {
                isolatedDiffTagScript[start] = words.splice(start, isolatedDiffTagIndex.length);
            }
            offset += isolatedDiffTagIndex.length - 1;
        }

        return isolatedDiffTagScript;
    }

    isOpeningIsolatedDiffTag(item: string, currentIsolatedDiffTag: string | null = null): string | false {
        const tagsToMatch =
            currentIsolatedDiffTag !== null
                ? {
                      [currentIsolatedDiffTag]: this.config.getIsolatedDiffTagPlaceholder(currentIsolatedDiffTag),
                  }
                : this.config.getIsolatedDiffTags();

        for (const key in tagsToMatch) {
            const pattern = new RegExp(`<${key}(\\s+[^>]*)?>`, 'iu');
            if (pattern.test(item)) {
                return key;
            }
        }

        return false;
    }

    isSelfClosingTag(text: string): boolean {
        return /<br.*>/.test(text) || /<[^>]+\/\s*>/iu.test(text);
    }

    isClosingIsolatedDiffTag(item: string, currentIsolatedDiffTag: string | null = null): string | false {
        const tagsToMatch =
            currentIsolatedDiffTag !== null
                ? {
                      [currentIsolatedDiffTag]: this.config.getIsolatedDiffTagPlaceholder(currentIsolatedDiffTag),
                  }
                : this.config.getIsolatedDiffTags();

        for (const key in tagsToMatch) {
            const pattern = new RegExp(`<\\/${key}(\\s+[^>]*)?>`, 'iu');
            if (pattern.test(item)) {
                return key;
            }
        }

        return false;
    }

    performOperation(operation: Operation): void {
        switch (operation.action) {
            case Operation.EQUAL:
                this.processEqualOperation(operation);
                break;
            case Operation.DELETE:
                this.processDeleteOperation(operation, 'diffdel');
                break;
            case Operation.INSERT:
                this.processInsertOperation(operation, 'diffins');
                break;
            case Operation.REPLACE:
                this.processReplaceOperation(operation);
                break;
        }
    }

    processReplaceOperation(operation: Operation): void {
        this.processDeleteOperation(operation, 'diffmod');
        this.processInsertOperation(operation, 'diffmod');
    }

    processInsertOperation(operation: Operation, cssClass: string): void {
        this.justProcessedDeleteFromIndex = -1;
        const text: string[] = [];
        const paragraphSplitIndexes = [];
        let rawIndex = 0;
        for (let pos = operation.startInNew; pos < operation.endInNew; pos++) {
            const s = this.newWords[pos];
            if (this.config.isIsolatedDiffTagPlaceholder(s) && this.newIsolatedDiffTags[pos]) {
                text.push(...this.newIsolatedDiffTags[pos]);
            } else if (s === '¶') {
                paragraphSplitIndexes.push(rawIndex);
                text.push(this.wrapText(s, 'ins', cssClass));
            } else {
                text.push(s);
            }
            rawIndex++;
        }
        paragraphSplitIndexes.reverse().forEach((paragraphSplitIndex) => {
            if (paragraphSplitIndex > 0 && paragraphSplitIndex < text.length - 1) {
                const temp = text[paragraphSplitIndex - 1];
                text[paragraphSplitIndex - 1] = text[paragraphSplitIndex];
                text[paragraphSplitIndex] = temp;
            }
        });
        this.insertTag('ins', cssClass, text);
    }

    processDeleteOperation(operation: Operation, cssClass: string): void {
        const text: string[] = [];
        const paragraphMergeIndexes = [];
        let rawIndex = 0;
        for (let pos = operation.startInOld; pos < operation.endInOld; pos++) {
            const s = this.oldWords[pos];
            if (this.config.isIsolatedDiffTagPlaceholder(s) && this.oldIsolatedDiffTags[pos]) {
                text.push(...this.oldIsolatedDiffTags[pos]);
            } else {
                if (s === '¶') {
                    paragraphMergeIndexes.push(rawIndex);
                }
                text.push(s);
            }
            rawIndex++;
        }
        paragraphMergeIndexes.reverse().forEach((paragraphMergeIndex) => {
            if (paragraphMergeIndex > 0 && paragraphMergeIndex < text.length - 1) {
                text.splice(paragraphMergeIndex + 1, 1);
                text.splice(paragraphMergeIndex - 1, 1);
            }
        });
        this.justProcessedDeleteFromIndex = this.content.length;
        this.insertTag('del', cssClass, text);
    }

    diffIsolatedPlaceholder(
        operation: Operation,
        pos: number,
        placeholder: string,
        stripWrappingTags: boolean = true
    ): string {
        const oldText = this.findIsolatedDiffTagsInOld(operation, pos).join('');
        const newText = this.newIsolatedDiffTags[pos].join('');

        if (this.isLinkPlaceholder(placeholder)) {
            return this.diffElementsByAttribute(oldText, newText, 'href', 'a');
        } else if (this.isImagePlaceholder(placeholder)) {
            return this.diffElementsByAttribute(oldText, newText, 'src', 'img');
        } else if (this.isPicturePlaceholder(placeholder)) {
            return this.diffPicture(oldText, newText);
        }

        return this.diffElements(oldText, newText, stripWrappingTags);
    }

    diffElements(oldText: string, newText: string, stripWrappingTags: boolean = true): string {
        let wrapStart = '';
        let wrapEnd = '';

        if (stripWrappingTags) {
            const pattern = /(^<[^>]+>)|(<\/[^>]+>$)/giu;
            const matches = newText.match(pattern) || [];

            wrapStart = matches[0] || '';
            wrapEnd = matches[1] || '';

            oldText = oldText.replace(pattern, '');
            newText = newText.replace(pattern, '');
        }

        const diff = HtmlDiff.create(oldText, newText);
        return wrapStart + diff.build() + wrapEnd;
    }

    diffPicture(oldText: string, newText: string): string {
        if (oldText !== newText) {
            return `${this.wrapText(oldText, 'del', 'diffmod')}${this.wrapText(newText, 'ins', 'diffmod')}`;
        }
        return this.diffElements(oldText, newText);
    }

    diffElementsByAttribute(oldText: string, newText: string, attribute: string, element: string): string {
        const oldAttribute = this.getAttributeFromTag(oldText, attribute);
        const newAttribute = this.getAttributeFromTag(newText, attribute);

        if (oldAttribute !== newAttribute) {
            const diffClass = `diffmod diff${element} diff${attribute}`;
            return `${this.wrapText(oldText, 'del', diffClass)}${this.wrapText(newText, 'ins', diffClass)}`;
        }

        return this.diffElements(oldText, newText);
    }

    processEqualOperation(operation: Operation): void {
        const result: string[] = [];
        for (let pos = operation.startInNew; pos < operation.endInNew; pos++) {
            const s = this.newWords[pos];
            if (this.config.isIsolatedDiffTagPlaceholder(s) && this.newIsolatedDiffTags[pos]) {
                result.push(this.diffIsolatedPlaceholder(operation, pos, s));
            } else if (s === '¶') {
                if (
                    pos > operation.startInNew &&
                    this.newWords[pos - 1] === '</p>' &&
                    pos < operation.endInNew - 1 &&
                    this.newWords[pos + 1].startsWith('<p>')
                ) {
                    result.push('<br>');
                }
            } else {
                result.push(s);
            }
        }

        if (result[0] === '</p>' || (result[0] === '.' && result[1] === '</p>')) {
            this.replaceParagraphSymbolWithBreaksIfNeeded();
        }
        this.justProcessedDeleteFromIndex = -1;
        this.content += result.join('');
    }

    replaceParagraphSymbolWithBreaksIfNeeded() {
        if (this.justProcessedDeleteFromIndex > -1) {
            const contentBeforeIndex = this.content.slice(0, this.justProcessedDeleteFromIndex);
            const contentAfterIndex = this.content.slice(this.justProcessedDeleteFromIndex);
            const replacedContent = contentAfterIndex.replace(/¶/g, '<br><br>');
            this.content = contentBeforeIndex + replacedContent;
        }
    }

    getAttributeFromTag(text: string, attribute: string): string | null {
        const pattern = new RegExp(`<[^>]*\\b${attribute}\\s*=\\s*(['"])(.*)\\1[^>]*>`, 'iu');
        const matches = text.match(pattern);
        if (matches) {
            return this.htmlspecialcharsDecode(matches[2]);
        }
        return null;
    }

    isLinkPlaceholder(text: string): boolean {
        return this.isPlaceholderType(text, 'a');
    }

    isImagePlaceholder(text: string): boolean {
        return this.isPlaceholderType(text, 'img');
    }

    isPicturePlaceholder(text: string): boolean {
        return this.isPlaceholderType(text, 'picture');
    }

    isPlaceholderType(text: string, types: string | string[]): boolean {
        if (!Array.isArray(types)) {
            types = [types];
        }

        const criteria: string[] = [];

        for (const type of types) {
            if (this.config.isIsolatedDiffTag(type)) {
                const placeholder = this.config.getIsolatedDiffTagPlaceholder(type);
                if (placeholder) {
                    criteria.push(placeholder);
                }
            } else {
                criteria.push(type);
            }
        }

        return criteria.includes(text);
    }

    findIsolatedDiffTagsInOld(operation: Operation, posInNew: number): string[] {
        const offset = posInNew - operation.startInNew;
        return this.oldIsolatedDiffTags[operation.startInOld + offset];
    }

    insertTag(tag: string, cssClass: string, words: string[]): void {
        while (words.length > 0) {
            const nonTags = this.extractConsecutiveWords(words, 'noTag');

            if (nonTags.length > 0) {
                this.content += this.wrapText(nonTags.join(''), tag, cssClass);
            }

            if (words.length === 0) {
                break;
            }

            const workTag = this.extractConsecutiveWords(words, 'tag');

            if (workTag[0] && this.isOpeningTag(workTag[0]) && !this.isClosingTag(workTag[0])) {
                if (workTag[0].includes('class=')) {
                    workTag[0] = workTag[0].replace('class="', 'class="diffmod ');
                } else {
                    const isSelfClosing = workTag[0].includes('/>');

                    if (isSelfClosing) {
                        workTag[0] = workTag[0].replace('/>', ' class="diffmod" />');
                    } else {
                        workTag[0] = workTag[0].replace('>', ' class="diffmod">');
                    }
                }
            }

            let appendContent = workTag.join('');

            if (workTag[0] && workTag[0].toLowerCase().includes('<img')) {
                appendContent = this.wrapText(appendContent, tag, cssClass);
            }

            this.content += appendContent;
        }
    }

    checkCondition(word: string, condition: string): boolean {
        return condition === 'tag' ? this.isTag(word) : !this.isTag(word);
    }

    wrapText(text: string, tagName: string, cssClass: string): string {
        if (!this.config.isSpaceMatching() && text.trim() === '') {
            return '';
        }

        return `<${tagName} class="${cssClass}">${text}</${tagName}>`;
    }

    extractConsecutiveWords(words: string[], condition: string): string[] {
        let indexOfFirstTag: number | null = null;

        for (let i = 0; i < words.length; i++) {
            if (!this.checkCondition(words[i], condition)) {
                indexOfFirstTag = i;
                break;
            }
        }

        if (indexOfFirstTag !== null) {
            const items = words.slice(0, indexOfFirstTag);
            words.splice(0, indexOfFirstTag);
            return items;
        } else {
            const items = words.slice();
            words.splice(0, words.length);
            return items;
        }
    }

    isTag(item: string): boolean {
        return this.isOpeningTag(item) || this.isClosingTag(item);
    }

    isOpeningTag(item: string): boolean {
        return /<[^>]+>\s*/iu.test(item);
    }

    isClosingTag(item: string): boolean {
        return /<\/[^>]+>\s*/iu.test(item);
    }

    operations(): Operation[] {
        let positionInOld = 0;
        let positionInNew = 0;
        const operations: Operation[] = [];

        const matches = this.matchingBlocks();
        matches.push(new MatchingBlock(this.oldWords.length, this.newWords.length, 0));

        for (const match of matches) {
            const matchStartsAtCurrentPositionInOld = positionInOld === match.startInOld;
            const matchStartsAtCurrentPositionInNew = positionInNew === match.startInNew;

            const action = this.getAction(matchStartsAtCurrentPositionInOld, matchStartsAtCurrentPositionInNew);

            if (action !== Operation.NONE) {
                operations.push(
                    new Operation(action, positionInOld, match.startInOld, positionInNew, match.startInNew)
                );
            }

            if (match.size !== 0) {
                operations.push(
                    new Operation(
                        Operation.EQUAL,
                        match.startInOld,
                        match.endInOld(),
                        match.startInNew,
                        match.endInNew()
                    )
                );
            }

            positionInOld = match.endInOld();
            positionInNew = match.endInNew();
        }

        return operations;
    }

    getAction(matchStartsAtCurrentPositionInOld: boolean, matchStartsAtCurrentPositionInNew: boolean): number {
        if (!matchStartsAtCurrentPositionInOld && !matchStartsAtCurrentPositionInNew) {
            return Operation.REPLACE;
        } else if (matchStartsAtCurrentPositionInOld && !matchStartsAtCurrentPositionInNew) {
            return Operation.INSERT;
        } else if (!matchStartsAtCurrentPositionInOld && matchStartsAtCurrentPositionInNew) {
            return Operation.DELETE;
        } else {
            return Operation.NONE;
        }
    }

    matchingBlocks(): MatchingBlock[] {
        const matchingBlocks: MatchingBlock[] = [];
        this.findMatchingBlocks(0, this.oldWords.length, 0, this.newWords.length, matchingBlocks);
        return matchingBlocks;
    }

    findMatchingBlocks(
        startInOld: number,
        endInOld: number,
        startInNew: number,
        endInNew: number,
        matchingBlocks: MatchingBlock[]
    ): void {
        const match = this.findMatch(startInOld, endInOld, startInNew, endInNew);

        if (match === null) {
            return;
        }

        if (startInOld < match.startInOld && startInNew < match.startInNew) {
            this.findMatchingBlocks(startInOld, match.startInOld, startInNew, match.startInNew, matchingBlocks);
        }

        matchingBlocks.push(match);

        if (match.endInOld() < endInOld && match.endInNew() < endInNew) {
            this.findMatchingBlocks(match.endInOld(), endInOld, match.endInNew(), endInNew, matchingBlocks);
        }
    }

    stripTagAttributes(word: string): string {
        const space = word.indexOf(' ', 1);

        if (space > 0) {
            return '<' + word.slice(1, space) + '>';
        }

        return word.trim().replace(/[<>]/g, '');
    }

    findMatch(startInOld: number, endInOld: number, startInNew: number, endInNew: number): MatchingBlock | null {
        let bestMatchInOld = startInOld;
        let bestMatchInNew = startInNew;
        let bestMatchSize = 0;
        let matchLengthAt: { [key: number]: number } = {};

        for (let indexInOld = startInOld; indexInOld < endInOld; indexInOld++) {
            const newMatchLengthAt: { [key: number]: number } = {};
            const initialWord = this.oldWords[indexInOld];

            let regularOrStrippedWord: string;
            if (this.isTag(initialWord)) {
                regularOrStrippedWord = this.stripTagAttributes(initialWord);
            } else {
                regularOrStrippedWord = initialWord;
            }

            if (!this.wordIndices.has(regularOrStrippedWord)) {
                matchLengthAt = newMatchLengthAt;
                continue;
            }

            for (const indexInNew of this.wordIndices.get(regularOrStrippedWord)!) {
                if (indexInNew < startInNew) {
                    continue;
                }

                if (indexInNew >= endInNew) {
                    break;
                }

                const newMatchLength = (matchLengthAt[indexInNew - 1] || 0) + 1;
                newMatchLengthAt[indexInNew] = newMatchLength;

                if (
                    newMatchLength > bestMatchSize ||
                    (bestMatchSize > 0 && this.oldTextIsOnlyWhitespace(bestMatchInOld, bestMatchSize))
                ) {
                    bestMatchInOld = indexInOld - newMatchLength + 1;
                    bestMatchInNew = indexInNew - newMatchLength + 1;
                    bestMatchSize = newMatchLength;
                }
            }

            matchLengthAt = newMatchLengthAt;
        }

        if (bestMatchSize !== 0 && !this.oldTextIsOnlyWhitespace(bestMatchInOld, bestMatchSize)) {
            return new MatchingBlock(bestMatchInOld, bestMatchInNew, bestMatchSize);
        }

        return null;
    }

    oldTextIsOnlyWhitespace(startingAtWord: number, wordCount: number): boolean {
        let largestWhitespaceLength = this.oldTextIsOnlyWhitespaceCache.get(startingAtWord);
        if (largestWhitespaceLength !== undefined) {
            return wordCount <= largestWhitespaceLength;
        }

        largestWhitespaceLength = 0;
        for (let index = startingAtWord; index < this.oldWords.length; index++) {
            const oldWord = this.oldWords[index];
            if (oldWord.trim() !== '') {
                break;
            }
            largestWhitespaceLength++;
        }

        this.oldTextIsOnlyWhitespaceCache.set(startingAtWord, largestWhitespaceLength);

        return wordCount <= largestWhitespaceLength;
    }

    htmlspecialcharsDecode(input: string) {
        return input
            .toString()
            .replaceAll('&lt;', '<')
            .replaceAll('&gt;', '>')
            .replaceAll('&quot;', '"')
            .replaceAll('&amp;', '&');
    }
}
