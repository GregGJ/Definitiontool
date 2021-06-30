import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { CMDData } from "../CMDData";
import { TaskQueue } from "../drongo/task/TaskQueue";
import { cnlog } from "../Log";
import { CalculateImageListTask } from "./CalculateImageListTask";
import { CalculateImageMD5Task } from "./CalculateImageMD5Task";
import { ImageCompressorTask } from "./ImageCompressorTask";


export class ImageCompressorPipeline extends TaskQueue {
    constructor() {
        super();

        //MD5
        this.addTask(new CalculateImageMD5Task());
        //计算需要处理的列表
        this.addTask(new CalculateImageListTask());
        //压缩图片
        this.addTask(new ImageCompressorTask());
    }

    start(data?: any): void {
        this.__init();
        super.start(data);
    }

    protected allComplete(): void {
        if (CMDData.data.fileConfigs.size == 0) {
            return;
        } else {
            let list: Array<{ file: string, md5: string, quality: string }> = [];
            let values = CMDData.data.fileConfigs.values();
            let next = values.next();
            while (!next.done) {
                list.push(next.value);
                next = values.next();
            }
            let jsonStr = JSON.stringify(list, null, 2);
            if (CMDData.data.fileRecordPath) {
                fs.writeFileSync(CMDData.data.fileRecordPath, jsonStr);
                CMDData.data.logger.info(cnlog("fileConfigs.json保存完毕: " + CMDData.data.fileRecordPath));
            }
        }
        //清理设置在CMDData.data上的数据
        this.clearDatas();
        super.allComplete();
    }



    private __init(): void {
        //验证路径
        CMDData.data.lowDefinition = CMDData.data.input + "/definitions/LowDefinition";
        CMDData.data.assetsPath = CMDData.data.input + "/assets";
        CMDData.data.pngquantExe = path.parse(__dirname).dir + "/tools/pngquant.exe"
        //先确定两个路径是否正确
        if (!fs.existsSync(CMDData.data.assetsPath) || !fs.existsSync(CMDData.data.lowDefinition)) {
            CMDData.data.logger.error(cnlog("input或output 文件夹不存在！"));
            return;
        }
        let assetsStats: fs.Stats = fs.statSync(CMDData.data.assetsPath);
        let assetsLDStats: fs.Stats = fs.statSync(CMDData.data.lowDefinition);
        if (!assetsStats.isDirectory() || !assetsLDStats.isDirectory()) {
            CMDData.data.logger.error(cnlog("input或output 必须是文件夹！"));
            return;
        }

        //读取两个配置文件
        let configPath: string;
        if (CMDData.data.configPath) {
            configPath = CMDData.data.configPath;
        } else {
            configPath = path.parse(CMDData.data.lowDefinition).dir + "/definitionConfig.json"
        }
        if (configPath) {
            if (fs.existsSync(configPath)) {
                let data = fs.readFileSync(configPath, "utf-8");
                CMDData.data.config = JSON.parse(data);
            }
        }

        //文件记录
        let fileRecordPath: string = CMDData.data.lowDefinition + "/fileConfigs.json";
        let fileConfigList: Array<{ file: string, md5: string, quality: string }> | undefined;
        if (fileRecordPath) {
            if (fs.existsSync(fileRecordPath)) {
                let data = fs.readFileSync(fileRecordPath, "utf-8");
                fileConfigList = JSON.parse(data);
            }
            CMDData.data.fileRecordPath = fileRecordPath;
        }
        //老的文件记录
        CMDData.data.fileConfigs = new Map<string, { file: string, md5: string, quality: string }>();
        if (fileConfigList && fileConfigList.length) {
            let fileConfig: { file: string, md5: string, quality: string };
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

        //图片压缩下限，小于这个size就不压缩
        let minSizeConfig: string = CMDData.data.config ? CMDData.data.config.minSize : "100*100";
        let arr: Array<string> = minSizeConfig.split("*");
        CMDData.data.minSize = Number(arr[0]) * Number(arr[1]);

        //排除列表
        CMDData.data.excludeMap = new Map<string, string>();
        if (CMDData.data.config) {
            for (let index = 0; index < CMDData.data.config.exclude.length; index++) {
                const file = CMDData.data.config.exclude[index];
                if (CMDData.data.config.excludeMap.has(file)) {
                    CMDData.data.logger.error(cnlog("definitionConfig.json中的exclude列表存在重复：" + file));
                    continue;
                }
                CMDData.data.config.excludeMap.set(file, file);
            }
        }

        //包含列表
        CMDData.data.includeMap = new Map<string, string>();
        if (CMDData.data.config) {
            for (let index = 0; index < CMDData.data.config.include.length; index++) {
                const file = CMDData.data.assetsPath + "/" + CMDData.data.config.include[index];
                this.recursionInclude(file);
            }
        }

        //自定义品质
        CMDData.data.customQualityMap = new Map<string, string>();
        if (CMDData.data.config) {
            for (let index = 0; index < CMDData.data.config.customs.length; index++) {
                const qualityData = CMDData.data.config.customs[index];
                if (CMDData.data.customQualityMap.has(qualityData.file)) {
                    CMDData.data.logger.error(cnlog("definitionConfig.json中的customs列表存在重复：" + qualityData.file));
                    continue;
                }
                CMDData.data.customQualityMap.set(qualityData.file, qualityData.quality);
            }
        }
    }

    /**
     * 递归包含
     * @param file 
     */
    private recursionInclude(file: string): void {
        const stats = fs.statSync(file);
        //递归包含
        if (stats.isDirectory()) {
            let fileList = fs.readdirSync(file);
            for (let index = 0; index < fileList.length; index++) {
                const element = fileList[index];
                this.recursionInclude(file + "/" + element);
            }
        } else {
            let extname: string = path.extname(file);
            extname = extname.toLocaleLowerCase();
            if (extname == ".png" || extname == ".jpg") {
                let relativePath: string = path.relative(CMDData.data.assetsPath, file);
                relativePath = relativePath.replace(/\\/g, "/");
                CMDData.data.includeMap.set(relativePath, relativePath);
            }
        }
    }

    private clearDatas(): void {
        CMDData.data.imageList.length = 0;
        delete CMDData.data["imageList"];

        CMDData.data.fileMD5List.length = 0;
        delete CMDData.data["fileMD5List"];

        CMDData.data.fileConfigs.clear();
        delete CMDData.data["fileConfigs"];

        CMDData.data.excludeMap.clear();
        delete CMDData.data["excludeMap"];

        CMDData.data.includeMap.clear();
        delete CMDData.data["includeMap"];

        CMDData.data.customQualityMap.clear();
        delete CMDData.data["customQualityMap"];

        delete CMDData.data["defaultQuality"];

        delete CMDData.data["config"];

        delete CMDData.data["pngquantExe"];

        delete CMDData.data["fileRecordPath"];

        delete CMDData.data["configPath"];

        delete CMDData.data["assetsPath"];

        delete CMDData.data["minSize"];

        delete CMDData.data["lowDefinition"];
    }
}