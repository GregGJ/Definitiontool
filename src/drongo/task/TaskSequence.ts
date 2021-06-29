import { DrongoEvent } from "../events/DrongoEvent";
import { ITask } from "./ITask";
import { Task } from "./Task";



/**
 * 任务序列（并行）
 */
export class TaskSequence extends Task {

    private __taskList: Array<ITask> = new Array<ITask>();
    private __index: number = 0;
    constructor() {
        super();
    }

    addTask(value: ITask): void {
        if (this.__taskList.indexOf(value) >= 0) {
            throw new Error("重复添加！");
        }
        this.__taskList.push(value);
    }

    removeTask(value: ITask): void {
        let index: number = this.__taskList.indexOf(value);
        if (index < 0) {
            throw new Error("找不到要删除的内容!");
        }
        this.__taskList.splice(index, 1);
    }

    start(data?: any): void {
        for (let index = 0; index < this.__taskList.length; index++) {
            const element = this.__taskList[index];
            element.addEvent(DrongoEvent.COMPLETE, this, this.__subTaskEventHandler);
            element.addEvent(DrongoEvent.ERROR, this, this.__subTaskEventHandler);
            element.addEvent(DrongoEvent.PROGRESS, this, this.__subTaskEventHandler);
            element.start();
        }
    }

    private __subTaskEventHandler(type: string, target: ITask, data?: any): void {
        if (type == DrongoEvent.PROGRESS) {
            this.dispatchEvent(DrongoEvent.PROGRESS, this.__index / this.__taskList.length);
            return;
        }
        target.removeAllEvent();
        if (type == DrongoEvent.ERROR) {
            this.dispatchEvent(DrongoEvent.ERROR, data);
            return;
        }
        this.__index++;
        if (this.__index < this.__taskList.length) {
            return;
        }
        target.destroy();
        //完成
        this.dispatchEvent(DrongoEvent.COMPLETE);
    }

    destroy(): void {
        super.destroy();
        this.__taskList.length = 0;
        this.__index = 0;
    }
}