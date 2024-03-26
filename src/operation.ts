export class Operation {
    static readonly INSERT = 1;
    static readonly DELETE = 2;
    static readonly REPLACE = 3;
    static readonly EQUAL = 4;
    static readonly NONE = 5;

    action: number;
    startInOld: number;
    endInOld: number;
    startInNew: number;
    endInNew: number;

    constructor(action: number, startInOld: number, endInOld: number, startInNew: number, endInNew: number) {
        this.action = action;
        this.startInOld = startInOld;
        this.endInOld = endInOld;
        this.startInNew = startInNew;
        this.endInNew = endInNew;
    }
}
