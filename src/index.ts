import { AbstractDiff } from './abstract-diff';
import { HtmlDiffConfig } from './html-diff-config';
import { Operation } from './operation';
import { MatchingBlock } from './matching-block';

export default class HtmlDiff extends AbstractDiff {
    protected wordIndices: { [key: string]: number[] } = {};
    protected newIsolatedDiffTags: { [key: number]: string[] } = {};
    protected oldIsolatedDiffTags: { [key: number]: string[] } = {};
    protected justProcessedDeleteFromIndex = -1;

    public static create(oldText: string, newText: string, config: HtmlDiffConfig | null = null): HtmlDiff {
        const diff = new this(oldText, newText);

        if (config !== null) {
            diff.setConfig(config);
        }

        return diff;
    }

    public setInsertSpaceInReplace(boolean: boolean): HtmlDiff {
        this.config.setInsertSpaceInReplace(boolean);
        return this;
    }

    public getInsertSpaceInReplace(): boolean {
        return this.config.isInsertSpaceInReplace();
    }

    public build(): string {
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

    protected indexNewWords(): void {
        this.wordIndices = {};

        for (let i = 0; i < this.newWords.length; i++) {
            let word = this.newWords[i];
            if (this.isTag(word)) {
                word = this.stripTagAttributes(word);
            }

            if (!this.wordIndices[word]) {
                this.wordIndices[word] = [];
            }

            this.wordIndices[word].push(i);
        }
    }

    protected replaceIsolatedDiffTags() {
        this.oldIsolatedDiffTags = this.createIsolatedDiffTagPlaceholders(this.oldWords);
        this.newIsolatedDiffTags = this.createIsolatedDiffTagPlaceholders(this.newWords);
    }

    protected createIsolatedDiffTagPlaceholders(words: string[]): {
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

    protected isOpeningIsolatedDiffTag(item: string, currentIsolatedDiffTag: string | null = null): string | false {
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

    protected isSelfClosingTag(text: string): boolean {
        return /<br.*>/.test(text) || /<[^>]+\/\s*>/iu.test(text);
    }

    protected isClosingIsolatedDiffTag(item: string, currentIsolatedDiffTag: string | null = null): string | false {
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

    protected performOperation(operation: Operation): void {
        switch (operation.action) {
            case 'equal':
                this.processEqualOperation(operation);
                break;
            case 'delete':
                this.processDeleteOperation(operation, 'diffdel');
                break;
            case 'insert':
                this.processInsertOperation(operation, 'diffins');
                break;
            case 'replace':
                this.processReplaceOperation(operation);
                break;
        }
    }

    protected processReplaceOperation(operation: Operation): void {
        this.processDeleteOperation(operation, 'diffmod');
        this.processInsertOperation(operation, 'diffmod');
    }

    protected processInsertOperation(operation: Operation, cssClass: string): void {
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

    protected processDeleteOperation(operation: Operation, cssClass: string): void {
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

    protected diffIsolatedPlaceholder(
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

    protected diffElements(oldText: string, newText: string, stripWrappingTags: boolean = true): string {
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

        const diff = (this.constructor as typeof HtmlDiff).create(oldText, newText, this.config);
        return wrapStart + diff.build() + wrapEnd;
    }

    protected diffPicture(oldText: string, newText: string): string {
        if (oldText !== newText) {
            return `${this.wrapText(oldText, 'del', 'diffmod')}${this.wrapText(newText, 'ins', 'diffmod')}`;
        }
        return this.diffElements(oldText, newText);
    }

    protected diffElementsByAttribute(oldText: string, newText: string, attribute: string, element: string): string {
        const oldAttribute = this.getAttributeFromTag(oldText, attribute);
        const newAttribute = this.getAttributeFromTag(newText, attribute);

        if (oldAttribute !== newAttribute) {
            const diffClass = `diffmod diff${element} diff${attribute}`;
            return `${this.wrapText(oldText, 'del', diffClass)}${this.wrapText(newText, 'ins', diffClass)}`;
        }

        return this.diffElements(oldText, newText);
    }

    protected processEqualOperation(operation: Operation): void {
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

    protected replaceParagraphSymbolWithBreaksIfNeeded() {
        if (this.justProcessedDeleteFromIndex > -1) {
            const contentBeforeIndex = this.content.slice(0, this.justProcessedDeleteFromIndex);
            const contentAfterIndex = this.content.slice(this.justProcessedDeleteFromIndex);
            const replacedContent = contentAfterIndex.replace(/¶/g, '<br><br>');
            this.content = contentBeforeIndex + replacedContent;
        }
    }

    protected getAttributeFromTag(text: string, attribute: string): string | null {
        const pattern = new RegExp(`<[^>]*\\b${attribute}\\s*=\\s*(['"])(.*)\\1[^>]*>`, 'iu');
        const matches = text.match(pattern);
        if (matches) {
            return this.htmlspecialcharsDecode(matches[2]);
        }
        return null;
    }

    protected isLinkPlaceholder(text: string): boolean {
        return this.isPlaceholderType(text, 'a');
    }

    protected isImagePlaceholder(text: string): boolean {
        return this.isPlaceholderType(text, 'img');
    }

    protected isPicturePlaceholder(text: string): boolean {
        return this.isPlaceholderType(text, 'picture');
    }

    protected isPlaceholderType(text: string, types: string | string[]): boolean {
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

    protected findIsolatedDiffTagsInOld(operation: Operation, posInNew: number): string[] {
        const offset = posInNew - operation.startInNew;
        return this.oldIsolatedDiffTags[operation.startInOld + offset];
    }

    protected insertTag(tag: string, cssClass: string, words: string[]): void {
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

    protected checkCondition(word: string, condition: string): boolean {
        return condition === 'tag' ? this.isTag(word) : !this.isTag(word);
    }

    protected wrapText(text: string, tagName: string, cssClass: string): string {
        if (!this.config.isSpaceMatching() && text.trim() === '') {
            return '';
        }

        return `<${tagName} class="${cssClass}">${text}</${tagName}>`;
    }

    protected extractConsecutiveWords(words: string[], condition: string): string[] {
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

    protected isTag(item: string): boolean {
        return this.isOpeningTag(item) || this.isClosingTag(item);
    }

    protected isOpeningTag(item: string): boolean {
        return /<[^>]+>\s*/iu.test(item);
    }

    protected isClosingTag(item: string): boolean {
        return /<\/[^>]+>\s*/iu.test(item);
    }

    protected operations(): Operation[] {
        let positionInOld = 0;
        let positionInNew = 0;
        const operations: Operation[] = [];

        const matches = this.matchingBlocks();
        matches.push(new MatchingBlock(this.oldWords.length, this.newWords.length, 0));

        for (const match of matches) {
            const matchStartsAtCurrentPositionInOld = positionInOld === match.startInOld;
            const matchStartsAtCurrentPositionInNew = positionInNew === match.startInNew;

            const action = this.getAction(matchStartsAtCurrentPositionInOld, matchStartsAtCurrentPositionInNew);

            if (action !== 'none') {
                operations.push(
                    new Operation(action, positionInOld, match.startInOld, positionInNew, match.startInNew)
                );
            }

            if (match.size !== 0) {
                operations.push(
                    new Operation('equal', match.startInOld, match.endInOld(), match.startInNew, match.endInNew())
                );
            }

            positionInOld = match.endInOld();
            positionInNew = match.endInNew();
        }

        return operations;
    }

    protected getAction(
        matchStartsAtCurrentPositionInOld: boolean,
        matchStartsAtCurrentPositionInNew: boolean
    ): string {
        if (!matchStartsAtCurrentPositionInOld && !matchStartsAtCurrentPositionInNew) {
            return 'replace';
        } else if (matchStartsAtCurrentPositionInOld && !matchStartsAtCurrentPositionInNew) {
            return 'insert';
        } else if (!matchStartsAtCurrentPositionInOld && matchStartsAtCurrentPositionInNew) {
            return 'delete';
        } else {
            return 'none';
        }
    }

    protected matchingBlocks(): MatchingBlock[] {
        const matchingBlocks: MatchingBlock[] = [];
        this.findMatchingBlocks(0, this.oldWords.length, 0, this.newWords.length, matchingBlocks);
        return matchingBlocks;
    }

    protected findMatchingBlocks(
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

    protected stripTagAttributes(word: string): string {
        const space = word.indexOf(' ', 1);

        if (space > 0) {
            return '<' + word.slice(1, space) + '>';
        }

        return word.trim().replace(/[<>]/g, '');
    }

    protected findMatch(
        startInOld: number,
        endInOld: number,
        startInNew: number,
        endInNew: number
    ): MatchingBlock | null {
        const groupDiffs = this.config.isGroupDiffs();
        let bestMatchInOld = startInOld;
        let bestMatchInNew = startInNew;
        let bestMatchSize = 0;
        let matchLengthAt: { [key: number]: number } = {};

        for (let indexInOld = startInOld; indexInOld < endInOld; indexInOld++) {
            const newMatchLengthAt: { [key: number]: number } = {};
            let index = this.oldWords[indexInOld];

            if (this.isTag(index)) {
                index = this.stripTagAttributes(index);
            }

            if (!this.wordIndices[index]) {
                matchLengthAt = newMatchLengthAt;
                continue;
            }

            for (const indexInNew of this.wordIndices[index]) {
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
                    (groupDiffs && bestMatchSize > 0 && this.oldTextIsOnlyWhitespace(bestMatchInOld, bestMatchSize))
                ) {
                    bestMatchInOld = indexInOld - newMatchLength + 1;
                    bestMatchInNew = indexInNew - newMatchLength + 1;
                    bestMatchSize = newMatchLength;
                }
            }

            matchLengthAt = newMatchLengthAt;
        }

        if (bestMatchSize !== 0 && (!groupDiffs || !this.oldTextIsOnlyWhitespace(bestMatchInOld, bestMatchSize))) {
            return new MatchingBlock(bestMatchInOld, bestMatchInNew, bestMatchSize);
        }

        return null;
    }

    protected oldTextIsOnlyWhitespace(startingAtWord: number, wordCount: number): boolean {
        let isWhitespace = true;

        for (let index = startingAtWord; index < startingAtWord + wordCount; index++) {
            const oldWord = this.oldWords[index];

            if (oldWord !== '' && oldWord.trim() !== '') {
                isWhitespace = false;
                break;
            }
        }

        return isWhitespace;
    }

    private htmlspecialcharsDecode(input: string) {
        return input
            .toString()
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&');
    }
}
