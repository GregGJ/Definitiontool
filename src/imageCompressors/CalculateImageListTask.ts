import * as path from "path";
import { CMDData } from "../CMDData";
import { DrongoEvent } from "../drongo/events/DrongoEvent";
import { Task } from "../drongo/task/Task";

/**
 * 计算有多少需要压缩的图片
 */
export class CalculateImageListTask  extends Task
{
    constructor(){
        super();
    }

    start(data?:any):void{
        this.buildFileList();
    }

    private buildFileList():void{
        let result: Array<{file:string,md5:string,quality:string}> = [];
        //对比MD5得出那些文件需要重新生成
        let currentFile:{file:string,md5:string};
        let oldFile: {file:string,md5:string,quality:string};
        for (let index = 0; index < this.fileMD5List.length; index++) {
            currentFile = this.fileMD5List[index];
            //老的列表中没有，说明是新的
            if (!this.oldFileConfigMap.has(currentFile.file)) {
                result.push({
                    file: currentFile.file,
                    quality: this.getQuality(currentFile.file),
                    md5:currentFile.md5
                });
                continue;
            }
            oldFile = this.oldFileConfigMap.get(currentFile.file)!;
            //如果再自定义列表中
            if (this.customQualityMap.has(currentFile.file)) {
                const customQualtiy = this.customQualityMap.get(currentFile.file)!;
                //如果自定义品质和上次的品质不同则需要重新构建
                if (oldFile.quality != customQualtiy) {
                    result.push({
                        file: currentFile.file,
                        quality: customQualtiy,
                        md5:currentFile.md5
                    });
                    continue;
                }
            }
            oldFile = this.oldFileConfigMap.get(currentFile.file)!;
            //MD5不相同
            if (currentFile.md5 !== oldFile.md5) {
                result.push({
                    file: currentFile.file,
                    quality: this.getQuality(currentFile.file),
                    md5:currentFile.md5
                }
                );
                continue;
            }
        }
        //赋值
        CMDData.data.imageList=result;
        console.log("经过计算本次需要处理："+result.length+"个图片!");
        this.dispatchEvent(DrongoEvent.COMPLETE);
    }

    private getQuality(fileRelativePath: string): string {
        //如果直接找到了自定义品质
        if (this.customQualityMap.has(fileRelativePath)) {
            return this.customQualityMap.get(fileRelativePath)!;
        }
        //递归父容器是否定义了品质
        let dirName: string = path.dirname(fileRelativePath);
        while (true) {
            //如果父级文件夹定义了品质
            if (this.customQualityMap.has(dirName)) {
                return this.customQualityMap.get(dirName)!;
            }
            dirName = path.dirname(dirName);
            if (dirName == ".") {
                break;
            }
        }
        return CMDData.data.defaultQuality;
    }

    private get fileMD5List():Array<{ file: string, md5: string }>{
        return CMDData.data.fileMD5List;
    }

    private get oldFileConfigMap():Map<string,{file:string,md5:string,quality:string}>{
        return CMDData.data.fileConfigs;
    }

    private get customQualityMap():Map<string,string>{
        return CMDData.data.customQualityMap;
    }
}