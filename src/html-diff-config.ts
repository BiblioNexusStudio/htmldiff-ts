export class HtmlDiffConfig {
    keepNewLines = false;
    isolatedDiffTags: { [key: string]: string } = {
        ol: '[[REPLACE_ORDERED_LIST]]',
        ul: '[[REPLACE_UNORDERED_LIST]]',
        sub: '[[REPLACE_SUB_SCRIPT]]',
        sup: '[[REPLACE_SUPER_SCRIPT]]',
        dl: '[[REPLACE_DEFINITION_LIST]]',
        table: '[[REPLACE_TABLE]]',
        a: '[[REPLACE_A]]',
        img: '[[REPLACE_IMG]]',
        pre: '[[REPLACE_PRE]]',
        picture: '[[REPLACE_PICTURE]]',
    };
    spaceMatching = false;

    static create(): HtmlDiffConfig {
        return new HtmlDiffConfig();
    }

    isKeepNewLines(): boolean {
        return this.keepNewLines;
    }

    getIsolatedDiffTags(): { [key: string]: string } {
        return this.isolatedDiffTags;
    }

    isIsolatedDiffTag(tag: string): boolean {
        return tag in this.isolatedDiffTags;
    }

    isIsolatedDiffTagPlaceholder(text: string): boolean {
        return Object.values(this.isolatedDiffTags).includes(text);
    }

    getIsolatedDiffTagPlaceholder(tag: string): string | null {
        return this.isIsolatedDiffTag(tag) ? this.isolatedDiffTags[tag] : null;
    }

    isSpaceMatching(): boolean {
        return this.spaceMatching;
    }
}
