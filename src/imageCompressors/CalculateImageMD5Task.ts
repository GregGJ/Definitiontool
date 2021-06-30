import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CMDData } from "../CMDData";
import { DrongoEvent } from "../drongo/events/DrongoEvent";
import { Task } from "../drongo/task/Task";
const imageinfo =require("imageinfo");

export class CalculateImageMD5Task extends Task {

    constructor() {
        super();
    }

    start() {
        let root: string = CMDData.data.assetsPath;
        let dir: string = root;
        let out:Array<{ file: string, md5: string }>=CMDData.data.fileMD5List=[];
        this.buildFileMD5(root,dir,out);
        this.dispatchEvent(DrongoEvent.COMPLETE);
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
        let imageSize:number;
        for (let index = 0; index < fileList.length; index++) {
            filePath = dir + "/" + fileList[index];
            status = fs.statSync(filePath);
            relativePath = path.relative(root, filePath);
            relativePath = relativePath.replace(/\\/g, "/");
            //如果被排除
            if (this.excludeMap&&this.excludeMap.has(relativePath)) {
                continue;
            }
            if (status.isFile()) {
                if(this.includeMap&&this.includeMap.has(relativePath)==false){
                    continue;
                }
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
                info=imageinfo(fileBuffer);
                imageSize=info.width*info.height;
                //如果小于最小限制就跳过
                if(imageSize<CMDData.data.minSize){
                    continue;
                }
                md5 = crypto.createHash("md5");
                md5Code = md5.update(fileBuffer).digest().toString("hex");
                //真实类型
                trueType="."+info.format.toLocaleLowerCase();
                if(extname!=trueType){
                    CMDData.data.logger.error("extname "+extname+" true type is "+trueType+" "+relativePath);
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

    private get includeMap():Map<string,string>{
        return CMDData.data.includeMap;
    }
}