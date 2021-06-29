import { CMDData } from "../CMDData";
import { Task } from "../drongo/task/Task";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { DrongoEvent } from "../drongo/events/DrongoEvent";
const imageinfo =require("imageinfo");

export class CalculateImageMD5Task extends Task {

    private illegalFiles:Array<string>=[];
    constructor() {
        super();
    }

    start() {
        let root: string = CMDData.data.input;
        let dir: string = root;
        let out:Array<{ file: string, md5: string }>=CMDData.data.fileMD5List=[];
        this.buildFileMD5(root,dir,out);
        // if(this.illegalFiles.length){
        //     this.dispatchEvent(DrongoEvent.ERROR,this.illegalFiles);
        // }else{
            this.dispatchEvent(DrongoEvent.COMPLETE);
        // }
    }

    private buildFileMD5(root: string, dir: string, out: Array<{ file: string, md5: string }>): void {
        let fileList = fs.readdirSync(dir);
        let filePath, status;
        let fileBuffer;
        let md5Code;
        let md5;
        let relativePath;
        let extname: string;
        let trueType:string;
        let info;

        for (let index = 0; index < fileList.length; index++) {
            filePath = dir + "/" + fileList[index];
            status = fs.statSync(filePath);
            relativePath = path.relative(root, filePath);
            relativePath = relativePath.replace(/\\/g, "/");
            if (this.excludeMap&&this.excludeMap.has(relativePath)) {
                continue;
            }
            if (status.isFile()) {
                extname = path.extname(filePath);
                extname = extname.toLocaleLowerCase();
                if (extname != ".png" && extname != ".jpg") {
                // if (extname != ".png") {
                    continue;
                }
                if(filePath.indexOf("-m.")>=0){
                    continue;
                }
                fileBuffer = fs.readFileSync(filePath);
                md5 = crypto.createHash("md5");
                md5Code = md5.update(fileBuffer).digest().toString("hex");

                info=imageinfo(fileBuffer);
                //真实类型
                trueType="."+info.format.toLocaleLowerCase();
                if(extname!=trueType){
                    this.illegalFiles.push("文件后缀"+extname+" 真实类型"+trueType+" "+relativePath);
                }else{
                    out.push({ file: relativePath, md5: md5Code });
                }
            } else {
                this.buildFileMD5(root, filePath, out);
            }
        }
    }

    private get excludeMap():Map<string,string>{
        return CMDData.data.excludeMap;
    }
}