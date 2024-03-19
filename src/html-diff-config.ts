export class HtmlDiffConfig {
  protected specialCaseChars: string[] = [".", ",", "(", ")", "'"];
  protected groupDiffs = true;
  protected insertSpaceInReplace = false;
  protected keepNewLines = false;
  protected encoding = "UTF-8";
  protected isolatedDiffTags: { [key: string]: string } = {
    ol: "[[REPLACE_ORDERED_LIST]]",
    ul: "[[REPLACE_UNORDERED_LIST]]",
    sub: "[[REPLACE_SUB_SCRIPT]]",
    sup: "[[REPLACE_SUPER_SCRIPT]]",
    dl: "[[REPLACE_DEFINITION_LIST]]",
    table: "[[REPLACE_TABLE]]",
    strong: "[[REPLACE_STRONG]]",
    b: "[[REPLACE_STRONG]]",
    em: "[[REPLACE_EM]]",
    i: "[[REPLACE_EM]]",
    a: "[[REPLACE_A]]",
    img: "[[REPLACE_IMG]]",
    pre: "[[REPLACE_PRE]]",
    picture: "[[REPLACE_PICTURE]]",
  };
  protected matchThreshold = 80;
  protected spaceMatching = false;

  public static create(): HtmlDiffConfig {
    return new HtmlDiffConfig();
  }

  public constructor() {
    // Empty constructor
  }

  public getMatchThreshold(): number {
    return this.matchThreshold;
  }

  public setMatchThreshold(matchThreshold: number): HtmlDiffConfig {
    this.matchThreshold = matchThreshold;
    return this;
  }

  public setSpecialCaseChars(chars: string[]): void {
    this.specialCaseChars = chars;
  }

  public getSpecialCaseChars(): string[] {
    return this.specialCaseChars;
  }

  public addSpecialCaseChar(char: string): HtmlDiffConfig {
    if (!this.specialCaseChars.includes(char)) {
      this.specialCaseChars.push(char);
    }
    return this;
  }

  public removeSpecialCaseChar(char: string): HtmlDiffConfig {
    const index = this.specialCaseChars.indexOf(char);
    if (index !== -1) {
      this.specialCaseChars.splice(index, 1);
    }
    return this;
  }

  public isGroupDiffs(): boolean {
    return this.groupDiffs;
  }

  public setGroupDiffs(groupDiffs: boolean): HtmlDiffConfig {
    this.groupDiffs = groupDiffs;
    return this;
  }

  public getEncoding(): string {
    return this.encoding;
  }

  public setEncoding(encoding: string): HtmlDiffConfig {
    this.encoding = encoding;
    return this;
  }

  public isInsertSpaceInReplace(): boolean {
    return this.insertSpaceInReplace;
  }

  public setInsertSpaceInReplace(
    insertSpaceInReplace: boolean,
  ): HtmlDiffConfig {
    this.insertSpaceInReplace = insertSpaceInReplace;
    return this;
  }

  public isKeepNewLines(): boolean {
    return this.keepNewLines;
  }

  public setKeepNewLines(keepNewLines: boolean): void {
    this.keepNewLines = keepNewLines;
  }

  public getIsolatedDiffTags(): { [key: string]: string } {
    return this.isolatedDiffTags;
  }

  public setIsolatedDiffTags(isolatedDiffTags: {
    [key: string]: string;
  }): HtmlDiffConfig {
    this.isolatedDiffTags = isolatedDiffTags;
    return this;
  }

  public addIsolatedDiffTag(
    tag: string,
    placeholder: string | null = null,
  ): HtmlDiffConfig {
    if (placeholder === null) {
      placeholder = `[[REPLACE_${tag.toUpperCase()}]]`;
    }

    if (
      this.isIsolatedDiffTag(tag) &&
      this.isolatedDiffTags[tag] !== placeholder
    ) {
      throw new Error(
        `Isolated diff tag "${tag}" already exists using a different placeholder`,
      );
    }

    const matchingKey = Object.keys(this.isolatedDiffTags).find(
      (key) => this.isolatedDiffTags[key] === placeholder,
    );
    if (matchingKey && matchingKey !== tag) {
      throw new Error(
        `Placeholder already being used for a different tag "${tag}"`,
      );
    }

    if (!this.isIsolatedDiffTag(tag)) {
      this.isolatedDiffTags[tag] = placeholder;
    }

    return this;
  }

  public removeIsolatedDiffTag(tag: string): HtmlDiffConfig {
    if (this.isIsolatedDiffTag(tag)) {
      delete this.isolatedDiffTags[tag];
    }
    return this;
  }

  public isIsolatedDiffTag(tag: string): boolean {
    return tag in this.isolatedDiffTags;
  }

  public isIsolatedDiffTagPlaceholder(text: string): boolean {
    return Object.values(this.isolatedDiffTags).includes(text);
  }

  public getIsolatedDiffTagPlaceholder(tag: string): string | null {
    return this.isIsolatedDiffTag(tag) ? this.isolatedDiffTags[tag] : null;
  }

  public isSpaceMatching(): boolean {
    return this.spaceMatching;
  }

  public setSpaceMatching(spaceMatching: boolean): void {
    this.spaceMatching = spaceMatching;
  }

  protected getOpeningTag(tag: string): RegExp {
    return new RegExp(`<${tag}[^>]*`, "i");
  }

  protected getClosingTag(tag: string): string {
    return `</${tag}>`;
  }
}
