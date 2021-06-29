import { TimeUtils } from "../utils/TimeUtils";
import { ITicker } from "./ITicker";
import { ITickManager } from "./ITickManager";

export class TickManagerImpl implements ITickManager {

    private __tickerList: Array<ITicker>;

    private __nextFrameCallBacks: Array<NextFrameHandler>;

    private __lasetTime:number;
    constructor() {
        this.__tickerList = [];
        this.__nextFrameCallBacks = [];
        this.__lasetTime=TimeUtils.getCurrentTime();
        setTimeout(()=>{
            const dt:number=TimeUtils.getCurrentTime()-this.__lasetTime;
            this.update(dt);
        },16);
    }

    update(dt: number): void {
        for (let index = 0; index < this.__tickerList.length; index++) {
            const element = this.__tickerList[index];
            element.tick(dt);
        }
        let handler: NextFrameHandler;
        while (this.__nextFrameCallBacks.length) {
            handler = this.__nextFrameCallBacks.shift()!;
            handler.callBack.apply(handler.caller);
        }
    }

    addTicker(value: ITicker): void {
        let index: number = this.__tickerList.indexOf(value);
        if (index >= 0) {
            throw new Error("Ticker 重复添加！");
        }
        this.__tickerList.push(value);
    }

    removeTicker(value: ITicker): void {
        let index: number = this.__tickerList.indexOf(value);
        if (index < 0) {
            throw new Error("找不到要删除的Tick！");
        }
        this.__tickerList.splice(index, 1);
    }

    callNextFrame(value: Function, caller: any): void {
        for (let index = 0; index < this.__nextFrameCallBacks.length; index++) {
            const element = this.__nextFrameCallBacks[index];
            //重复
            if (element.equal(value, caller)) {
                return;
            }
        }
        this.__nextFrameCallBacks.push(new NextFrameHandler(value, caller));
    }

    clearNextFrame(value: Function, caller: any): void {
        for (let index = 0; index < this.__nextFrameCallBacks.length; index++) {
            const element = this.__nextFrameCallBacks[index];
            //删除
            if (element.equal(value, caller)) {
                this.__nextFrameCallBacks.splice(index, 1);
            }
        }
    }
}

class NextFrameHandler {
    callBack: Function;
    caller: any;

    constructor(callBack: Function, caller: any) {
        this.callBack = callBack;
        this.caller = caller;
    }

    equal(callBack: Function, caller: any): boolean {
        if (caller !== caller) {
            return false;
        }
        if (this.callBack !== callBack) {
            return false;
        }
        return true;
    }
}