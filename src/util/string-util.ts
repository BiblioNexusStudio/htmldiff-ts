export class StringUtil {
  constructor() {
    // No need for any initialization
  }

  public strlen(str: string): number {
    return str.length;
  }

  public strpos(haystack: string, needle: string, offset: number = 0): number {
    return haystack.indexOf(needle, offset);
  }

  public stripos(haystack: string, needle: string, offset: number = 0): number {
    return haystack.toLowerCase().indexOf(needle.toLowerCase(), offset);
  }

  public substr(
    str: string,
    start: number,
    length: number | null = null,
  ): string {
    return str.substr(start, length ?? undefined);
  }
}
