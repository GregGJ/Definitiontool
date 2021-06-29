import { EventDispatcher } from "../events/EventDispatcher";
import { ITask } from "./ITask";



export class Task extends EventDispatcher implements ITask {

    /**
     * 开始
     * @param data 
     */
    start(data?: any): void {

    }

    /**
     * 销毁
     */
    destroy(): void {
        this.removeAllEvent();
    }
}