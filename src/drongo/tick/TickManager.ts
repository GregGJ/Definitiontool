import { Injector } from "../utils/Injector";
import { ITicker } from "./ITicker";
import { ITickManager } from "./ITickManager";


export class TickManager {
    static KEY: string = "drongo.TickManager";
    /**
     * 添加
     * @param value 
     */
    static addTicker(value: ITicker): void {
        this.impl.addTicker(value);
    }

    /**
     * 删除
     * @param value 
     */
    static removeTicker(value: ITicker): void {
        this.impl.removeTicker(value);
    }

    /**
     * 下一帧回调
     * @param value 
     */
    static callNextFrame(value: Function, caller: any): void {
        this.impl.callNextFrame(value, caller);
    }

    static clearNextFrame(value: Function, caller: any): void {
        this.impl.clearNextFrame(value, caller);
    }

    private static __impl: ITickManager;
    static get impl(): ITickManager {
        if (this.__impl == null) {
            this.__impl = Injector.getInject(this.KEY);
        }
        if (this.__impl == null) {
            throw new Error(this.KEY + " 未注入!");
        }
        return this.__impl;
    }
}