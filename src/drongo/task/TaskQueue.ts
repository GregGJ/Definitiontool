import { DrongoEvent } from "../events/DrongoEvent";
import { ITask } from "./ITask";
import { Task } from "./Task";



/**
 * 任务队列
 */
export class TaskQueue extends Task {

    private __taskList: Array<ITask>;
    private __index: number = 0;
    constructor() {
        super();
        this.__taskList = [];
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
            throw new Error("未找到要删除的内容！");
        }
        this.__taskList.splice(index, 1);
    }

    start(data?: any): void {
        this.__index = 0;
        this.__tryNext();
    }

    private __tryNext(): void {
        if (this.__index < this.__taskList.length) {
            let task: ITask = this.__taskList[this.__index];
            task.addEvent(DrongoEvent.COMPLETE, this, this.__subTaskEventHandler);
            task.addEvent(DrongoEvent.PROGRESS, this, this.__subTaskEventHandler);
            task.addEvent(DrongoEvent.ERROR, this, this.__subTaskEventHandler);
            task.start();
        } else {
            this.allComplete();
        }
    }
    
    protected allComplete():void{
        //结束
        this.dispatchEvent(DrongoEvent.COMPLETE);
    }

    private __subTaskEventHandler(key: string, target: ITask, data?: any): void {
        if (key == DrongoEvent.PROGRESS) {
            let progress: number = isNaN(data) ? (this.__index + data) / this.__taskList.length : this.__index / this.__taskList.length;
            this.dispatchEvent(DrongoEvent.PROGRESS, progress);
            return;
        }
        target.removeAllEvent();
        if (key == DrongoEvent.ERROR) {
            this.dispatchEvent(DrongoEvent.ERROR, data);
            return;
        }
        target.destroy();
        this.__index++;
        this.__tryNext();
    }

    destroy(): void {
        super.destroy();
        this.__taskList.length = 0;
        this.__index = 0;
    }
}