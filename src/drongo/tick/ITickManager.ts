import { ITicker } from "./ITicker";



export interface ITickManager {

    addTicker(value: ITicker): void;

    removeTicker(value: ITicker): void;

    callNextFrame(value: Function, caller: any): void;

    clearNextFrame(value: Function, caller: any): void;
}