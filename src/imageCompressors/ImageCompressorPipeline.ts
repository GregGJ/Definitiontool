import { CMDData } from "../CMDData";
import { TaskQueue } from "../drongo/task/TaskQueue";
import { CalculateImageMD5Task } from "./CalculateImageMD5Task";
import { CalculateImageListTask } from "./CalculateImageListTask";
import { ImageCompressorTask } from "./ImageCompressorTask";
import * as path from "path";
import * as fs from "fs"


export class ImageCompressorPipeline extends TaskQueue {
    constructor() {
        super();

        this.addTask(new CalculateImageMD5Task());
        this.addTask(new CalculateImageListTask());
        this.addTask(new ImageCompressorTask());
    }

    start(data?: any): void {
        this.__init();
        super.start(data);
    }

    protected allComplete():void{
        if(CMDData.data.fileConfigs.size==0){
            throw new Error("没有发现任何图片！");
        }
        let list:Array<{file:string,md5:string,quality:string}>=[];
        let values=CMDData.data.fileConfigs.values();
        let next=values.next();
        while (!next.done){
            list.push(next.value);
            next=values.next();
        }
        let jsonStr=JSON.stringify(list,null,2);
        if(CMDData.data.fileRecordPath){
            fs.writeFileSync(CMDData.data.fileRecordPath,jsonStr);
            console.log("fileConfigs.json保存完毕: "+CMDData.data.fileRecordPath)
        }
        super.allComplete();
    }

    private __init(): void {
        //验证路径
        //先确定两个路径是否正确
        if (!fs.existsSync(CMDData.data.input) || !fs.existsSync(CMDData.data.output)) {
            throw new Error("input或output 文件夹不存在！");
        }
        let assetsStats: fs.Stats = fs.statSync(CMDData.data.input);
        let assetsLDStats: fs.Stats = fs.statSync(CMDData.data.output);
        if (!assetsStats.isDirectory() || !assetsLDStats.isDirectory()) {
            throw new Error("input或output 必须是文件夹");
        }

        //读取两个配置文件
        let configPath: string;
        if (CMDData.data.configPath) {
            configPath = CMDData.data.configPath;
        } else {
            configPath = path.parse(CMDData.data.input).dir + "/definitions/definitionConfig.json"
        }
        if (configPath) {
            if (fs.existsSync(configPath)) {
                let data = fs.readFileSync(configPath, "utf-8");
                CMDData.data.config = JSON.parse(data);
            }
        }

        //文件记录
        let fileRecordPath: string = CMDData.data.output + "/fileConfigs.json";
        let fileConfigList:Array<{file:string,md5:string,quality:string}>|undefined;
        if (fileRecordPath) {
            if (fs.existsSync(fileRecordPath)) {
                let data = fs.readFileSync(fileRecordPath, "utf-8");
                fileConfigList = JSON.parse(data);
            }
            CMDData.data.fileRecordPath = fileRecordPath;
        }
        //老的文件记录
        CMDData.data.fileConfigs=new Map<string,{file:string,md5:string,quality:string}>();
        if (fileConfigList && fileConfigList.length) {
            let fileConfig: {file:string,md5:string,quality:string};
            for (let index = 0; index < fileConfigList.length; index++) {
                fileConfig = fileConfigList[index];
                CMDData.data.fileConfigs.set(fileConfig.file, fileConfig);
            }
        }
        //解析清晰度配置
        this.__decodeDefinitionConfig();
    }

    private __decodeDefinitionConfig(): void {
        //默认品质
        CMDData.data.defaultQuality = CMDData.data.config ? CMDData.data.config.defaultQuality : "80-90";

        //排除列表
        CMDData.data.excludeMap = new Map<string, string>();
        if (CMDData.data.config) {
            for (let index = 0; index < CMDData.data.config.exclude.length; index++) {
                const file = CMDData.data.config.exclude[index];
                if (CMDData.data.config.excludeMap.has(file)) {
                    console.error("definitionConfig.json中的exclude列表存在重复：" + file);
                }
                CMDData.data.config.excludeMap.set(file, file);
            }
        }

        //自定义品质
        CMDData.data.customQualityMap = new Map<string, string>();
        if (CMDData.data.config) {
            for (let index = 0; index < CMDData.data.config.customs.length; index++) {
                const qualityData = CMDData.data.config.customs[index];
                if (CMDData.data.customQualityMap.has(qualityData.file)) {
                    console.error("definitionConfig.json中的customs列表存在重复：" + qualityData.file);
                }
                CMDData.data.customQualityMap.set(qualityData.file, qualityData.quality);
            }
        }
    }
}