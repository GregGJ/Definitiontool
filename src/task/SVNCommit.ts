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
            throw new Error("svn commit folder not exists:"+this.folder);
        }
    }

    start(data?: any): void {
        let cmd: string =this.folder+"/commit.bat";
        CMDData.data.logger.info("svn commit"+this.folder);
        var childProcess: child_process.ChildProcess = child_process.exec(cmd, (err) => {
            if (err) {
                CMDData.data.logger.error("svn commit failure"+this.folder+" "+err.message);
            }
            CMDData.data.logger.info("svn commit succeed"+this.folder);
            childProcess.kill();
            this.dispatchEvent(DrongoEvent.COMPLETE);
        });
    }
}