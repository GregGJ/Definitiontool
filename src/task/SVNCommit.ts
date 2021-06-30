import * as child_process from "child_process";
import * as fs from "fs";
import { CMDData } from "../CMDData";
import { DrongoEvent } from "../drongo/events/DrongoEvent";
import { Task } from "../drongo/task/Task";

export class SVNCommit extends Task {

    /**
     * 文件夹
     */
    private folder: string

    constructor(folder: string) {
        super();
        this.folder = folder;
        if(!fs.existsSync(this.folder)){
            throw new Error("SVN提交文件夹不存在:"+this.folder);
        }
    }

    start(data?: any): void {
        let cmd: string =this.folder+"/commit.bat";
        CMDData.data.logger.info("提交压缩记录到SVN"+this.folder);
        var childProcess: child_process.ChildProcess = child_process.exec(cmd, (err) => {
            if (err) {
                CMDData.data.logger.error("提交压缩记录失败"+this.folder+" "+err.message);
            }
            CMDData.data.logger.info("提交压缩记录成功"+this.folder);
            childProcess.kill();
            this.dispatchEvent(DrongoEvent.COMPLETE);
        });
    }
}