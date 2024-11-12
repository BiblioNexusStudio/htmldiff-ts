This is a port of https://github.com/caxy/php-htmldiff/tree/master in Typescript.

## Notes

-   Lots of simplifications were made from the original PHP version.
-   It is not very performant on large HTML docs, so it's best to use in a Web Worker to avoid blocking the main thread.
-   To visually display the diffs, add CSS that targets the following classes:
    -   diffmod -> the formatting changed for the text
    -   diffins -> the text was added
    -   diffdel -> the text was removed

## Development

Install `bun` if you don't already have it.

`npm install -g bun`

Run `yarn build` before committing.
