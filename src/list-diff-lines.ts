import { HtmlDiff } from ".";
import { AbstractDiff } from "./abstract-diff";
import { HtmlDiffConfig } from "./html-diff-config";
import { LcsService } from "./lcs-service";
import { Operation } from "./operation";
import { ListItemMatchStrategy } from "./strategy/list-item-match-strategy";

export class ListDiffLines extends AbstractDiff {
  private static readonly CLASS_LIST_ITEM_ADDED = "normal new";
  private static readonly CLASS_LIST_ITEM_DELETED = "removed";
  private static readonly CLASS_LIST_ITEM_CHANGED = "replacement";
  private static readonly CLASS_LIST_ITEM_NONE = "normal";

  protected static readonly LIST_TAG_NAMES = ["ul", "ol", "dl"];

  protected static listContentTags = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "pre",
    "div",
    "br",
    "hr",
    "code",
    "input",
    "form",
    "img",
    "span",
    "a",
    "i",
    "b",
    "strong",
    "em",
    "font",
    "big",
    "del",
    "tt",
    "sub",
    "sup",
    "strike",
  ];

  protected lcsService: LcsService;

  private nodeCache: { [key: string]: Element[] } = {};

  public static create(
    oldText: string,
    newText: string,
    config: HtmlDiffConfig | null = null,
  ): ListDiffLines {
    const diff = new ListDiffLines(oldText, newText);

    if (config !== null) {
      diff.setConfig(config);
    }

    return diff;
  }

  public build(): string {
    this.lcsService = new LcsService(
      new ListItemMatchStrategy(
        this.stringUtil,
        this.config.getMatchThreshold(),
      ),
    );

    return this.listByLines(this.oldText, this.newText);
  }

  protected listByLines(old: string, newText: string): string {
    const encodedNew = this.encodeNumericEntities(newText);
    const encodedOld = this.encodeNumericEntities(old);

    const newDom = new DOMParser().parseFromString(encodedNew, "text/html");
    const oldDom = new DOMParser().parseFromString(encodedOld, "text/html");

    const newListNode = this.findListNode(newDom);
    const oldListNode = this.findListNode(oldDom);

    const operations = this.getListItemOperations(oldListNode, newListNode);

    return this.processOperations(operations, oldListNode, newListNode);
  }

  protected findListNode(dom: Document): Element {
    const xPathQuery = "//" + ListDiffLines.LIST_TAG_NAMES.join("|//");
    const listNodes = dom.evaluate(
      xPathQuery,
      dom,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null,
    );

    if (listNodes.snapshotLength > 0) {
      return listNodes.snapshotItem(0) as Element;
    }

    throw new Error("Unable to diff list; missing list node");
  }

  protected getListItemOperations(
    oldListNode: Element,
    newListNode: Element,
  ): Operation[] {
    const oldListText = this.getListTextArray(oldListNode);
    const newListText = this.getListTextArray(newListNode);

    const lcsMatches = this.lcsService.longestCommonSubsequence(
      oldListText,
      newListText,
    );

    const oldLength = oldListText.length;
    const newLength = newListText.length;

    const operations: Operation[] = [];
    let currentLineInOld = 0;
    let currentLineInNew = 0;
    lcsMatches[oldLength + 1] = newLength + 1;

    for (const matchInOld of lcsMatches) {
      const matchInNew = lcsMatches[matchInOld];

      if (matchInNew === 0) {
        continue;
      }

      const nextLineInOld = currentLineInOld + 1;
      const nextLineInNew = currentLineInNew + 1;

      if (matchInNew > nextLineInNew && matchInOld > nextLineInOld) {
        operations.push(
          new Operation(
            Operation.CHANGED,
            nextLineInOld,
            Number(matchInOld) - 1,
            nextLineInNew,
            matchInNew - 1,
          ),
        );
      } else if (matchInNew > nextLineInNew && matchInOld === nextLineInOld) {
        operations.push(
          new Operation(
            Operation.ADDED,
            currentLineInOld,
            currentLineInOld,
            nextLineInNew,
            matchInNew - 1,
          ),
        );
      } else if (matchInNew === nextLineInNew && matchInOld > nextLineInOld) {
        operations.push(
          new Operation(
            Operation.DELETED,
            nextLineInOld,
            Number(matchInOld) - 1,
            currentLineInNew,
            currentLineInNew,
          ),
        );
      }

      currentLineInNew = matchInNew;
      currentLineInOld = Number(matchInOld);
    }

    return operations;
  }

  protected getListTextArray(listNode: Element): string[] {
    const output: string[] = [];

    for (const listItem of Array.from(listNode.childNodes)) {
      if (listItem.nodeType === Node.TEXT_NODE) {
        continue;
      }

      output.push(this.getRelevantNodeText(listItem as Element));
    }

    return output;
  }

  protected getRelevantNodeText(node: Element): string {
    if (!node.hasChildNodes()) {
      return node.textContent || "";
    }

    let output = "";

    for (const child of Array.from(node.childNodes)) {
      if (!child.hasChildNodes()) {
        output += this.getOuterText(child as Element);
        continue;
      }

      if (
        ListDiffLines.listContentTags.includes(child.nodeName.toLowerCase())
      ) {
        output += `<${child.nodeName.toLowerCase()}>${this.getRelevantNodeText(child as Element)}</${child.nodeName.toLowerCase()}>`;
      }
    }

    return output;
  }

  protected deleteListItem(li: Element): string {
    this.wrapNodeContent(li, "del");
    this.appendClassToNode(li, ListDiffLines.CLASS_LIST_ITEM_DELETED);
    return this.getOuterText(li);
  }

  protected addListItem(li: Element, replacement = false): string {
    this.wrapNodeContent(li, "ins");
    this.appendClassToNode(
      li,
      replacement
        ? ListDiffLines.CLASS_LIST_ITEM_CHANGED
        : ListDiffLines.CLASS_LIST_ITEM_ADDED,
    );
    return this.getOuterText(li);
  }

  protected processOperations(
    operations: Operation[],
    oldListNode: Element,
    newListNode: Element,
  ): string {
    let output = "";

    let indexInOld = 0;
    let indexInNew = 0;
    let lastOperation: Operation | null = null;

    for (const operation of operations) {
      let replaced = false;

      while (
        operation.startInOld >
        (operation.action === Operation.ADDED ? indexInOld : indexInOld + 1)
      ) {
        const li = this.getChildNodeByIndex(oldListNode, indexInOld);
        let matchingLi: Element | null = null;

        if (
          operation.startInNew >
          (operation.action === Operation.DELETED ? indexInNew : indexInNew + 1)
        ) {
          matchingLi = this.getChildNodeByIndex(newListNode, indexInNew);
        }

        if (matchingLi !== null) {
          const htmlDiff = HtmlDiff.create(
            this.getInnerHtml(li),
            this.getInnerHtml(matchingLi),
            this.config,
          );

          this.setInnerHtml(li, htmlDiff.build());
          indexInNew++;
        }

        let className = ListDiffLines.CLASS_LIST_ITEM_NONE;

        if (lastOperation?.action === Operation.DELETED && !replaced) {
          className = ListDiffLines.CLASS_LIST_ITEM_CHANGED;
          replaced = true;
        }

        this.appendClassToNode(li, className);
        output += this.getOuterText(li);
        indexInOld++;
      }

      switch (operation.action) {
        case Operation.ADDED:
          for (let i = operation.startInNew; i <= operation.endInNew; i++) {
            output += this.addListItem(
              this.getChildNodeByIndex(newListNode, i - 1),
            );
          }
          indexInNew = operation.endInNew;
          break;

        case Operation.DELETED:
          for (let i = operation.startInOld; i <= operation.endInOld; i++) {
            output += this.deleteListItem(
              this.getChildNodeByIndex(oldListNode, i - 1),
            );
          }
          indexInOld = operation.endInOld;
          break;

        case Operation.CHANGED:
          let changeDelta = 0;
          for (let i = operation.startInOld; i <= operation.endInOld; i++) {
            output += this.deleteListItem(
              this.getChildNodeByIndex(oldListNode, i - 1),
            );
            changeDelta--;
          }
          for (let i = operation.startInNew; i <= operation.endInNew; i++) {
            output += this.addListItem(
              this.getChildNodeByIndex(newListNode, i - 1),
              changeDelta < 0,
            );
            changeDelta++;
          }
          indexInOld = operation.endInOld;
          indexInNew = operation.endInNew;
          break;
      }

      lastOperation = operation;
    }

    const oldCount = this.childCountWithoutTextNode(oldListNode);
    const newCount = this.childCountWithoutTextNode(newListNode);

    while (indexInOld < oldCount) {
      const li = this.getChildNodeByIndex(oldListNode, indexInOld);
      let matchingLi: Element | null = null;

      if (indexInNew < newCount) {
        matchingLi = this.getChildNodeByIndex(newListNode, indexInNew);
      }

      if (matchingLi !== null) {
        const htmlDiff = HtmlDiff.create(
          this.getInnerHtml(li),
          this.getInnerHtml(matchingLi),
          this.config,
        );

        this.setInnerHtml(li, htmlDiff.build());
        indexInNew++;
      }

      let className = ListDiffLines.CLASS_LIST_ITEM_NONE;

      if (lastOperation?.action === Operation.DELETED) {
        className = ListDiffLines.CLASS_LIST_ITEM_CHANGED;
      }

      this.appendClassToNode(li, className);
      output += this.getOuterText(li);
      indexInOld++;
    }

    this.setInnerHtml(newListNode, output);
    this.appendClassToNode(newListNode, "diff-list");

    return newListNode.outerHTML;
  }

  protected appendClassToNode(node: Element, className: string): void {
    node.setAttribute(
      "class",
      (node.getAttribute("class") || "") + ` ${className}`,
    );
  }

  private getOuterText(node: Element): string {
    return node.outerHTML;
  }

  private getInnerHtml(node: Element): string {
    return node.innerHTML;
  }

  private setInnerHtml(node: Element, html: string): void {
    const encodedHtml = this.encodeNumericEntities(`<body>${html}</body>`);
    const dom = new DOMParser().parseFromString(encodedHtml, "text/html");
    const bodyNode = dom.body;

    node.innerHTML = "";

    for (const childNode of Array.from(bodyNode.childNodes)) {
      node.appendChild(childNode.cloneNode(true));
    }

    this.nodeCache = {};
  }

  private wrapNodeContent(node: Element, tagName: string): void {
    const childNodes = Array.from(node.childNodes);
    const wrapNode = document.createElement(tagName);

    node.appendChild(wrapNode);

    for (const childNode of childNodes) {
      wrapNode.appendChild(childNode);
    }
  }

  private childCountWithoutTextNode(node: Element): number {
    return Array.from(node.childNodes).filter(
      (childNode) => childNode.nodeType !== Node.TEXT_NODE,
    ).length;
  }

  private getChildNodeByIndex(node: Element, index: number): Element {
    const nodeHash = node.outerHTML;

    if (this.nodeCache[nodeHash]) {
      return this.nodeCache[nodeHash][index];
    }

    this.nodeCache[nodeHash] = Array.from(node.childNodes).filter(
      (childNode) => childNode.nodeType !== Node.TEXT_NODE,
    ) as Element[];

    return this.nodeCache[nodeHash][index];
  }

  private encodeNumericEntities(text: string): string {
    return text.replace(/[\u0080-\uFFFF]/g, (match) => {
      return `&#${match.charCodeAt(0)};`;
    });
  }
}
