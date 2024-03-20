export class Operation {
    static readonly ADDED = 'a';
    static readonly DELETED = 'd';
    static readonly CHANGED = 'c';

    action: string;
    startInOld: number;
    endInOld: number;
    startInNew: number;
    endInNew: number;

    constructor(action: string, startInOld: number, endInOld: number, startInNew: number, endInNew: number) {
        this.action = action;
        this.startInOld = startInOld;
        this.endInOld = endInOld;
        this.startInNew = startInNew;
        this.endInNew = endInNew;
    }
}
