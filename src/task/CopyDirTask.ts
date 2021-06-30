import * as fs from "fs";
import * as path from "path";
import { CMDData } from "../CMDData";
import { DrongoEvent } from "../drongo/events/DrongoEvent";
import { Task } from "../drongo/task/Task";
const fsex = require("fs-extra");


export class CopyDirTask extends Task {

    private source: string;
    private target: string;
    private exclusion:Map<string,string>;
    constructor(source: string, target: string, exclusion?: Array<string>) {
        super();
        this.source = source;
        this.target = target;
        if(!fs.existsSync(this.source)){
            throw new Error("要copy的文件/文件夹不存在:"+this.source);
        }
        this.exclusion=new Map<string,string>();
        if(exclusion){
            for (let index = 0; index < exclusion.length; index++) {
                const element = exclusion[index];
                this.exclusion.set(element,element);
            }
        }
    }

    start(data?: any) {
        CMDData.data.logger.info("开始Copy："+this.source+" to "+this.target);
        fsex.copy(this.source, this.target, { filter: this.filterFunc.bind(this) }, (err: any) => {
            if (err) {
                return console.error(err);
            }
            CMDData.data.logger.info("Copy完成："+this.source+" to "+this.target);
            this.dispatchEvent(DrongoEvent.COMPLETE);
        });
    }

    private filterFunc(src: string, dest: any): boolean {
        let relativePath: string = path.relative(this.source, src);
        relativePath = relativePath.replace(/\\/g, "/");
        if(this.exclusion.has(relativePath)){
            return false;
        }
        return true;
    }
}