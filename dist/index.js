// src/html-diff-config.ts
class HtmlDiffConfig {
  specialCaseChars = [".", ",", "(", ")", "'"];
  groupDiffs = true;
  insertSpaceInReplace = false;
  keepNewLines = false;
  encoding = "UTF-8";
  isolatedDiffTags = {
    ol: "[[REPLACE_ORDERED_LIST]]",
    ul: "[[REPLACE_UNORDERED_LIST]]",
    sub: "[[REPLACE_SUB_SCRIPT]]",
    sup: "[[REPLACE_SUPER_SCRIPT]]",
    dl: "[[REPLACE_DEFINITION_LIST]]",
    table: "[[REPLACE_TABLE]]",
    a: "[[REPLACE_A]]",
    img: "[[REPLACE_IMG]]",
    pre: "[[REPLACE_PRE]]",
    picture: "[[REPLACE_PICTURE]]"
  };
  matchThreshold = 80;
  spaceMatching = false;
  static create() {
    return new HtmlDiffConfig;
  }
  constructor() {
  }
  getMatchThreshold() {
    return this.matchThreshold;
  }
  setMatchThreshold(matchThreshold) {
    this.matchThreshold = matchThreshold;
    return this;
  }
  setSpecialCaseChars(chars) {
    this.specialCaseChars = chars;
  }
  getSpecialCaseChars() {
    return this.specialCaseChars;
  }
  addSpecialCaseChar(char) {
    if (!this.specialCaseChars.includes(char)) {
      this.specialCaseChars.push(char);
    }
    return this;
  }
  removeSpecialCaseChar(char) {
    const index = this.specialCaseChars.indexOf(char);
    if (index !== -1) {
      this.specialCaseChars.splice(index, 1);
    }
    return this;
  }
  isGroupDiffs() {
    return this.groupDiffs;
  }
  setGroupDiffs(groupDiffs) {
    this.groupDiffs = groupDiffs;
    return this;
  }
  getEncoding() {
    return this.encoding;
  }
  setEncoding(encoding) {
    this.encoding = encoding;
    return this;
  }
  isInsertSpaceInReplace() {
    return this.insertSpaceInReplace;
  }
  setInsertSpaceInReplace(insertSpaceInReplace) {
    this.insertSpaceInReplace = insertSpaceInReplace;
    return this;
  }
  isKeepNewLines() {
    return this.keepNewLines;
  }
  setKeepNewLines(keepNewLines) {
    this.keepNewLines = keepNewLines;
  }
  getIsolatedDiffTags() {
    return this.isolatedDiffTags;
  }
  setIsolatedDiffTags(isolatedDiffTags) {
    this.isolatedDiffTags = isolatedDiffTags;
    return this;
  }
  addIsolatedDiffTag(tag, placeholder = null) {
    if (placeholder === null) {
      placeholder = `[[REPLACE_${tag.toUpperCase()}]]`;
    }
    if (this.isIsolatedDiffTag(tag) && this.isolatedDiffTags[tag] !== placeholder) {
      throw new Error(`Isolated diff tag "${tag}" already exists using a different placeholder`);
    }
    const matchingKey = Object.keys(this.isolatedDiffTags).find((key) => this.isolatedDiffTags[key] === placeholder);
    if (matchingKey && matchingKey !== tag) {
      throw new Error(`Placeholder already being used for a different tag "${tag}"`);
    }
    if (!this.isIsolatedDiffTag(tag)) {
      this.isolatedDiffTags[tag] = placeholder;
    }
    return this;
  }
  removeIsolatedDiffTag(tag) {
    if (this.isIsolatedDiffTag(tag)) {
      delete this.isolatedDiffTags[tag];
    }
    return this;
  }
  isIsolatedDiffTag(tag) {
    return tag in this.isolatedDiffTags;
  }
  isIsolatedDiffTagPlaceholder(text) {
    return Object.values(this.isolatedDiffTags).includes(text);
  }
  getIsolatedDiffTagPlaceholder(tag) {
    return this.isIsolatedDiffTag(tag) ? this.isolatedDiffTags[tag] : null;
  }
  isSpaceMatching() {
    return this.spaceMatching;
  }
  setSpaceMatching(spaceMatching) {
    this.spaceMatching = spaceMatching;
  }
  getOpeningTag(tag) {
    return new RegExp(`<${tag}[^>]*`, "i");
  }
  getClosingTag(tag) {
    return `</${tag}>`;
  }
}

// src/util/string-util.ts
class StringUtil {
  constructor() {
  }
  strlen(str) {
    return str.length;
  }
  strpos(haystack, needle, offset = 0) {
    return haystack.indexOf(needle, offset);
  }
  stripos(haystack, needle, offset = 0) {
    return haystack.toLowerCase().indexOf(needle.toLowerCase(), offset);
  }
  substr(str, start, length = null) {
    return str.substr(start, length ?? undefined);
  }
}

// src/abstract-diff.ts
class AbstractDiff {
  config;
  content;
  oldText;
  newText;
  oldWords = [];
  newWords = [];
  stringUtil;
  constructor(oldText, newText, encoding = "UTF-8", groupDiffs = null) {
    this.stringUtil = new StringUtil;
    this.config = HtmlDiffConfig.create().setEncoding(encoding);
    if (groupDiffs !== null) {
      this.config.setGroupDiffs(groupDiffs);
    }
    this.oldText = oldText;
    this.newText = newText;
    this.content = "";
  }
  getConfig() {
    return this.config;
  }
  setConfig(config) {
    this.config = config;
    return this;
  }
  splitInputsToWords() {
    this.setOldWords(this.convertHtmlToListOfWords(this.oldText));
    this.setNewWords(this.convertHtmlToListOfWords(this.newText));
  }
  setOldWords(oldWords) {
    this.oldWords = oldWords;
  }
  setNewWords(newWords) {
    this.newWords = newWords;
  }
  convertHtmlToListOfWords(text) {
    const words = [];
    let specialCharacters = "";
    for (const char of this.config.getSpecialCaseChars()) {
      specialCharacters += ([",", "'"].includes(char) ? "" : "\\") + char;
    }
    text = text.replace("\xC2\xA0", " ");
    text.match(/<.+?>|[^<]+/gmu)?.forEach((sentenceOrHtmlTag) => {
      if (sentenceOrHtmlTag === "") {
        return;
      }
      if (sentenceOrHtmlTag[0] === "<") {
        if (sentenceOrHtmlTag === "</p>") {
          words.push(sentenceOrHtmlTag);
          words.push("\xB6");
        } else {
          words.push(sentenceOrHtmlTag);
        }
        return;
      }
      sentenceOrHtmlTag = this.normalizeWhitespaceInHtmlSentence(sentenceOrHtmlTag);
      const sentenceSplitIntoWords = [];
      const regex = new RegExp("\\s|[" + specialCharacters + "|[a-zA-Z0-9" + specialCharacters + "\\p{L}]+[a-zA-Z0-9\\p{L}]|[^\\s]", "gmu");
      (sentenceOrHtmlTag + " ").match(regex)?.forEach((word) => {
        sentenceSplitIntoWords.push(word);
      });
      sentenceSplitIntoWords.pop();
      words.push(...sentenceSplitIntoWords);
    });
    return words;
  }
  normalizeWhitespaceInHtmlSentence(sentence) {
    if (this.config.isKeepNewLines() === true) {
      return sentence;
    }
    sentence = sentence.replace(/\s\s+|\r+|\n+|\r\n+/g, " ");
    const sentenceLength = this.stringUtil.strlen(sentence);
    const firstCharacter = this.stringUtil.substr(sentence, 0, 1);
    const lastCharacter = this.stringUtil.substr(sentence, sentenceLength - 1, 1);
    if (firstCharacter === " " || firstCharacter === "\r" || firstCharacter === "\n") {
      sentence = " " + sentence.trimStart();
    }
    if (sentenceLength > 1 && (lastCharacter === " " || lastCharacter === "\r" || lastCharacter === "\n")) {
      sentence = sentence.trimEnd() + " ";
    }
    return sentence;
  }
}

// src/operation.ts
class Operation {
  static ADDED = "a";
  static DELETED = "d";
  static CHANGED = "c";
  action;
  startInOld;
  endInOld;
  startInNew;
  endInNew;
  constructor(action, startInOld, endInOld, startInNew, endInNew) {
    this.action = action;
    this.startInOld = startInOld;
    this.endInOld = endInOld;
    this.startInNew = startInNew;
    this.endInNew = endInNew;
  }
}

// src/matching-block.ts
class MatchingBlock {
  startInOld;
  startInNew;
  size;
  constructor(startInOld, startInNew, size) {
    this.startInOld = startInOld;
    this.startInNew = startInNew;
    this.size = size;
  }
  endInOld() {
    return this.startInOld + this.size;
  }
  endInNew() {
    return this.startInNew + this.size;
  }
  count() {
    return this.size;
  }
}

// src/index.ts
class HtmlDiff extends AbstractDiff {
  constructor() {
    super(...arguments);
  }
  wordIndices = {};
  newIsolatedDiffTags = {};
  oldIsolatedDiffTags = {};
  justProcessedDeleteFromIndex = -1;
  static create(oldText, newText, config = null) {
    const diff = new this(oldText, newText);
    if (config !== null) {
      diff.setConfig(config);
    }
    return diff;
  }
  setInsertSpaceInReplace(boolean) {
    this.config.setInsertSpaceInReplace(boolean);
    return this;
  }
  getInsertSpaceInReplace() {
    return this.config.isInsertSpaceInReplace();
  }
  build() {
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
  indexNewWords() {
    this.wordIndices = {};
    for (let i = 0;i < this.newWords.length; i++) {
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
  replaceIsolatedDiffTags() {
    this.oldIsolatedDiffTags = this.createIsolatedDiffTagPlaceholders(this.oldWords);
    this.newIsolatedDiffTags = this.createIsolatedDiffTagPlaceholders(this.newWords);
  }
  createIsolatedDiffTagPlaceholders(words) {
    let openIsolatedDiffTags = 0;
    const isolatedDiffTagIndices = [];
    let isolatedDiffTagStart = 0;
    let currentIsolatedDiffTag = null;
    for (let index = 0;index < words.length; index++) {
      const word = words[index];
      const openIsolatedDiffTag = this.isOpeningIsolatedDiffTag(word, currentIsolatedDiffTag);
      if (openIsolatedDiffTag) {
        if (this.isSelfClosingTag(word) || word.toLowerCase().includes("<img")) {
          if (openIsolatedDiffTags === 0) {
            isolatedDiffTagIndices.push({
              start: index,
              length: 1,
              tagType: openIsolatedDiffTag
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
            tagType: currentIsolatedDiffTag
          });
          currentIsolatedDiffTag = null;
        }
      }
    }
    const isolatedDiffTagScript = {};
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
  isOpeningIsolatedDiffTag(item, currentIsolatedDiffTag = null) {
    const tagsToMatch = currentIsolatedDiffTag !== null ? {
      [currentIsolatedDiffTag]: this.config.getIsolatedDiffTagPlaceholder(currentIsolatedDiffTag)
    } : this.config.getIsolatedDiffTags();
    for (const key in tagsToMatch) {
      const pattern = new RegExp(`<${key}(\\s+[^>]*)?>`, "iu");
      if (pattern.test(item)) {
        return key;
      }
    }
    return false;
  }
  isSelfClosingTag(text) {
    return /<br.*>/.test(text) || /<[^>]+\/\s*>/iu.test(text);
  }
  isClosingIsolatedDiffTag(item, currentIsolatedDiffTag = null) {
    const tagsToMatch = currentIsolatedDiffTag !== null ? {
      [currentIsolatedDiffTag]: this.config.getIsolatedDiffTagPlaceholder(currentIsolatedDiffTag)
    } : this.config.getIsolatedDiffTags();
    for (const key in tagsToMatch) {
      const pattern = new RegExp(`<\\/${key}(\\s+[^>]*)?>`, "iu");
      if (pattern.test(item)) {
        return key;
      }
    }
    return false;
  }
  performOperation(operation2) {
    switch (operation2.action) {
      case "equal":
        this.processEqualOperation(operation2);
        break;
      case "delete":
        this.processDeleteOperation(operation2, "diffdel");
        break;
      case "insert":
        this.processInsertOperation(operation2, "diffins");
        break;
      case "replace":
        this.processReplaceOperation(operation2);
        break;
    }
  }
  processReplaceOperation(operation2) {
    this.processDeleteOperation(operation2, "diffmod");
    this.processInsertOperation(operation2, "diffmod");
  }
  processInsertOperation(operation2, cssClass) {
    this.justProcessedDeleteFromIndex = -1;
    const text = [];
    const paragraphSplitIndexes = [];
    let rawIndex = 0;
    for (let pos = operation2.startInNew;pos < operation2.endInNew; pos++) {
      const s = this.newWords[pos];
      if (this.config.isIsolatedDiffTagPlaceholder(s) && this.newIsolatedDiffTags[pos]) {
        text.push(...this.newIsolatedDiffTags[pos]);
      } else if (s === "\xB6") {
        paragraphSplitIndexes.push(rawIndex);
        text.push(this.wrapText(s, "ins", cssClass));
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
    this.insertTag("ins", cssClass, text);
  }
  processDeleteOperation(operation2, cssClass) {
    const text = [];
    const paragraphMergeIndexes = [];
    let rawIndex = 0;
    for (let pos = operation2.startInOld;pos < operation2.endInOld; pos++) {
      const s = this.oldWords[pos];
      if (this.config.isIsolatedDiffTagPlaceholder(s) && this.oldIsolatedDiffTags[pos]) {
        text.push(...this.oldIsolatedDiffTags[pos]);
      } else {
        if (s === "\xB6") {
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
    this.insertTag("del", cssClass, text);
  }
  diffIsolatedPlaceholder(operation2, pos, placeholder, stripWrappingTags = true) {
    const oldText = this.findIsolatedDiffTagsInOld(operation2, pos).join("");
    const newText = this.newIsolatedDiffTags[pos].join("");
    if (this.isLinkPlaceholder(placeholder)) {
      return this.diffElementsByAttribute(oldText, newText, "href", "a");
    } else if (this.isImagePlaceholder(placeholder)) {
      return this.diffElementsByAttribute(oldText, newText, "src", "img");
    } else if (this.isPicturePlaceholder(placeholder)) {
      return this.diffPicture(oldText, newText);
    }
    return this.diffElements(oldText, newText, stripWrappingTags);
  }
  diffElements(oldText, newText, stripWrappingTags = true) {
    let wrapStart = "";
    let wrapEnd = "";
    if (stripWrappingTags) {
      const pattern = /(^<[^>]+>)|(<\/[^>]+>$)/giu;
      const matches = newText.match(pattern) || [];
      wrapStart = matches[0] || "";
      wrapEnd = matches[1] || "";
      oldText = oldText.replace(pattern, "");
      newText = newText.replace(pattern, "");
    }
    const diff = this.constructor.create(oldText, newText, this.config);
    return wrapStart + diff.build() + wrapEnd;
  }
  diffPicture(oldText, newText) {
    if (oldText !== newText) {
      return `${this.wrapText(oldText, "del", "diffmod")}${this.wrapText(newText, "ins", "diffmod")}`;
    }
    return this.diffElements(oldText, newText);
  }
  diffElementsByAttribute(oldText, newText, attribute, element) {
    const oldAttribute = this.getAttributeFromTag(oldText, attribute);
    const newAttribute = this.getAttributeFromTag(newText, attribute);
    if (oldAttribute !== newAttribute) {
      const diffClass = `diffmod diff${element} diff${attribute}`;
      return `${this.wrapText(oldText, "del", diffClass)}${this.wrapText(newText, "ins", diffClass)}`;
    }
    return this.diffElements(oldText, newText);
  }
  processEqualOperation(operation2) {
    const result = [];
    for (let pos = operation2.startInNew;pos < operation2.endInNew; pos++) {
      const s = this.newWords[pos];
      if (this.config.isIsolatedDiffTagPlaceholder(s) && this.newIsolatedDiffTags[pos]) {
        result.push(this.diffIsolatedPlaceholder(operation2, pos, s));
      } else if (s === "\xB6") {
        if (pos > operation2.startInNew && this.newWords[pos - 1] === "</p>" && pos < operation2.endInNew - 1 && this.newWords[pos + 1].startsWith("<p>")) {
          result.push("<br>");
        }
      } else {
        result.push(s);
      }
    }
    if (result[0] === "</p>" || result[0] === "." && result[1] === "</p>") {
      this.replaceParagraphSymbolWithBreaksIfNeeded();
    }
    this.justProcessedDeleteFromIndex = -1;
    this.content += result.join("");
  }
  replaceParagraphSymbolWithBreaksIfNeeded() {
    if (this.justProcessedDeleteFromIndex > -1) {
      const contentBeforeIndex = this.content.slice(0, this.justProcessedDeleteFromIndex);
      const contentAfterIndex = this.content.slice(this.justProcessedDeleteFromIndex);
      const replacedContent = contentAfterIndex.replace(/¶/g, "<br><br>");
      this.content = contentBeforeIndex + replacedContent;
    }
  }
  getAttributeFromTag(text, attribute) {
    const pattern = new RegExp(`<[^>]*\\b${attribute}\\s*=\\s*(['"])(.*)\\1[^>]*>`, "iu");
    const matches = text.match(pattern);
    if (matches) {
      return this.htmlspecialcharsDecode(matches[2]);
    }
    return null;
  }
  isLinkPlaceholder(text) {
    return this.isPlaceholderType(text, "a");
  }
  isImagePlaceholder(text) {
    return this.isPlaceholderType(text, "img");
  }
  isPicturePlaceholder(text) {
    return this.isPlaceholderType(text, "picture");
  }
  isPlaceholderType(text, types) {
    if (!Array.isArray(types)) {
      types = [types];
    }
    const criteria = [];
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
  findIsolatedDiffTagsInOld(operation2, posInNew) {
    const offset = posInNew - operation2.startInNew;
    return this.oldIsolatedDiffTags[operation2.startInOld + offset];
  }
  insertTag(tag, cssClass, words) {
    while (words.length > 0) {
      const nonTags = this.extractConsecutiveWords(words, "noTag");
      if (nonTags.length > 0) {
        this.content += this.wrapText(nonTags.join(""), tag, cssClass);
      }
      if (words.length === 0) {
        break;
      }
      const workTag = this.extractConsecutiveWords(words, "tag");
      if (workTag[0] && this.isOpeningTag(workTag[0]) && !this.isClosingTag(workTag[0])) {
        if (workTag[0].includes("class=")) {
          workTag[0] = workTag[0].replace('class="', 'class="diffmod ');
        } else {
          const isSelfClosing = workTag[0].includes("/>");
          if (isSelfClosing) {
            workTag[0] = workTag[0].replace("/>", ' class="diffmod" />');
          } else {
            workTag[0] = workTag[0].replace(">", ' class="diffmod">');
          }
        }
      }
      let appendContent = workTag.join("");
      if (workTag[0] && workTag[0].toLowerCase().includes("<img")) {
        appendContent = this.wrapText(appendContent, tag, cssClass);
      }
      this.content += appendContent;
    }
  }
  checkCondition(word, condition) {
    return condition === "tag" ? this.isTag(word) : !this.isTag(word);
  }
  wrapText(text, tagName, cssClass) {
    if (!this.config.isSpaceMatching() && text.trim() === "") {
      return "";
    }
    return `<${tagName} class="${cssClass}">${text}</${tagName}>`;
  }
  extractConsecutiveWords(words, condition) {
    let indexOfFirstTag = null;
    for (let i = 0;i < words.length; i++) {
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
  isTag(item) {
    return this.isOpeningTag(item) || this.isClosingTag(item);
  }
  isOpeningTag(item) {
    return /<[^>]+>\s*/iu.test(item);
  }
  isClosingTag(item) {
    return /<\/[^>]+>\s*/iu.test(item);
  }
  operations() {
    let positionInOld = 0;
    let positionInNew = 0;
    const operations = [];
    const matches = this.matchingBlocks();
    matches.push(new MatchingBlock(this.oldWords.length, this.newWords.length, 0));
    for (const match of matches) {
      const matchStartsAtCurrentPositionInOld = positionInOld === match.startInOld;
      const matchStartsAtCurrentPositionInNew = positionInNew === match.startInNew;
      const action = this.getAction(matchStartsAtCurrentPositionInOld, matchStartsAtCurrentPositionInNew);
      if (action !== "none") {
        operations.push(new Operation(action, positionInOld, match.startInOld, positionInNew, match.startInNew));
      }
      if (match.size !== 0) {
        operations.push(new Operation("equal", match.startInOld, match.endInOld(), match.startInNew, match.endInNew()));
      }
      positionInOld = match.endInOld();
      positionInNew = match.endInNew();
    }
    return operations;
  }
  getAction(matchStartsAtCurrentPositionInOld, matchStartsAtCurrentPositionInNew) {
    if (!matchStartsAtCurrentPositionInOld && !matchStartsAtCurrentPositionInNew) {
      return "replace";
    } else if (matchStartsAtCurrentPositionInOld && !matchStartsAtCurrentPositionInNew) {
      return "insert";
    } else if (!matchStartsAtCurrentPositionInOld && matchStartsAtCurrentPositionInNew) {
      return "delete";
    } else {
      return "none";
    }
  }
  matchingBlocks() {
    const matchingBlocks = [];
    this.findMatchingBlocks(0, this.oldWords.length, 0, this.newWords.length, matchingBlocks);
    return matchingBlocks;
  }
  findMatchingBlocks(startInOld, endInOld, startInNew, endInNew, matchingBlocks) {
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
  stripTagAttributes(word) {
    const space = word.indexOf(" ", 1);
    if (space > 0) {
      return "<" + word.slice(1, space) + ">";
    }
    return word.trim().replace(/[<>]/g, "");
  }
  findMatch(startInOld, endInOld, startInNew, endInNew) {
    const groupDiffs = this.config.isGroupDiffs();
    let bestMatchInOld = startInOld;
    let bestMatchInNew = startInNew;
    let bestMatchSize = 0;
    let matchLengthAt = {};
    for (let indexInOld = startInOld;indexInOld < endInOld; indexInOld++) {
      const newMatchLengthAt = {};
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
        if (newMatchLength > bestMatchSize || groupDiffs && bestMatchSize > 0 && this.oldTextIsOnlyWhitespace(bestMatchInOld, bestMatchSize)) {
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
  oldTextIsOnlyWhitespace(startingAtWord, wordCount) {
    let isWhitespace = true;
    for (let index = startingAtWord;index < startingAtWord + wordCount; index++) {
      const oldWord = this.oldWords[index];
      if (oldWord !== "" && oldWord.trim() !== "") {
        isWhitespace = false;
        break;
      }
    }
    return isWhitespace;
  }
  htmlspecialcharsDecode(input) {
    return input.toString().replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  }
}
export {
  HtmlDiff as default
};
