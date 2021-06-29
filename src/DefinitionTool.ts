import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { ImageCompressor } from "./ImageCompressor";
const imageinfo =require("imageinfo");

export class DefinitionTool {
    /**
     * 上次导出记录
     */
    private oldFileConfigMap: Map<string, FileConfigData>;

    /**
     * 当前所有文件的MD5
     */
    private fileMD5List: Array<MD5Data>;

    /**
     * 自定义品质
     */
    private customQualityMap: Map<string, string>;

    /**
     * 排除列表
     */
    private excludeMap: Map<string, string>;

    /**
     * 默认品质
     */
    private defaultQuality: string = "80-90";

    private fileRecordPath?:string;


    private illegalFiles:Array<string>;
    constructor() {
        this.oldFileConfigMap = new Map<string, FileConfigData>();
        this.customQualityMap = new Map<string, string>();
        this.fileMD5List = [];
        this.excludeMap = new Map<string, string>();
        this.illegalFiles=[];
    }

    /**
     * 开始
     * @param assets        工程assets路径 
     * @param lowDefinitionAssets     低清晰度路径
     * @param dConfig           自定义设置
     * @param fileConfigs       上次处理记录
     */
    start(assets: string, lowDefinitionAssets: string,configPath?:string,fileRecordPath?:string): void {
        let dConfig: DefinitionConfig | undefined;
        let fileConfigs: Array<FileConfigData> | undefined;

        if (configPath) {
            if(fs.existsSync(configPath)){
                let data = fs.readFileSync(configPath, "utf-8");
                dConfig = JSON.parse(data);
            }
        }
        if (fileRecordPath) {
            if(fs.existsSync(fileRecordPath)){
                let data = fs.readFileSync(fileRecordPath, "utf-8");
                fileConfigs = JSON.parse(data);
            }
            this.fileRecordPath=fileRecordPath;
        }

        //先确定两个路径是否正确
        if (!fs.existsSync(assets) || !fs.existsSync(lowDefinitionAssets)) {
            throw new Error("assets或assetsLD 文件夹不存在！");
        }
        let assetsStats: fs.Stats = fs.statSync(assets);
        let assetsLDStats: fs.Stats = fs.statSync(lowDefinitionAssets);
        if (!assetsStats.isDirectory() || !assetsLDStats.isDirectory()) {
            throw new Error("assets或assetsLD 必须是文件夹");
        }
        
        //默认品质
        this.defaultQuality = dConfig ? dConfig.defaultQuality : "80-90";

        //老的文件记录
        this.oldFileConfigMap.clear();
        if (fileConfigs && fileConfigs.length) {
            let fileConfig: FileConfigData;
            for (let index = 0; index < fileConfigs.length; index++) {
                fileConfig = fileConfigs[index];
                this.oldFileConfigMap.set(fileConfig.file, fileConfig);
            }
        }

        //排除列表
        this.excludeMap.clear();
        if (dConfig) {
            for (let index = 0; index < dConfig.exclude.length; index++) {
                const file = dConfig.exclude[index];
                if (this.excludeMap.has(file)) {
                    console.error("definitionConfig.json中的exclude列表存在重复：" + file);
                }
                this.excludeMap.set(file, file);
            }
        }

        //自定义品质
        this.customQualityMap.clear();
        if (dConfig) {
            for (let index = 0; index < dConfig.customs.length; index++) {
                const qualityData = dConfig.customs[index];
                if (this.customQualityMap.has(qualityData.file)) {
                    console.error("definitionConfig.json中的customs列表存在重复：" + qualityData.file);
                }
                this.customQualityMap.set(qualityData.file, qualityData.quality);
            }
        }

        //构建所有文件列表
        console.log("开始构建MD5文件列表.");
        this.__buildFileMD5(assets, assets, this.fileMD5List);
        console.log("MD5文件数量："+this.fileMD5List.length);

        console.log("开始计算有多少需要压缩的图片.");
        let result = this.__buildFileList(assets);
        if(this.illegalFiles.length){
            console.group("检测到非法文件,请正确处理好这些文件后重试！！！");
            for (let index = 0; index < this.illegalFiles.length; index++) {
                const element = this.illegalFiles[index];
                console.log(element);
            }
            console.groupEnd();
            return;
        }
        if(result.length){
            let imageCompressor:ImageCompressor=new ImageCompressor();
            imageCompressor.start(assets,lowDefinitionAssets,result,this.oldFileConfigMap,this.compressComplete.bind(this));
        }else{
            //不需要压缩
            console.log("不需要压缩！！！");
        }
    }

    private compressComplete():void{
        if(this.oldFileConfigMap.size==0){
            throw new Error("没有发现任何图片！");
        }
        let list:Array<FileConfigData>=[];
        let values=this.oldFileConfigMap.values();
        let next=values.next();
        while (!next.done){
            list.push(next.value);
            next=values.next();
        }
        let jsonStr=JSON.stringify(list,null,2);
        if(this.fileRecordPath){
            fs.writeFileSync(this.fileRecordPath,jsonStr);
            console.log("fileConfigs.json保存完毕: "+this.fileRecordPath)
        }

        process.exit();
    }

    private getQuality(assetRoot: string, fileRelativePath: string): string {
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
        return this.defaultQuality;
    }

    private __buildFileList(assetsPath: string): Array<FileConfigData> {
        let result: Array<FileConfigData> = [];
        //对比MD5得出那些文件需要重新生成
        let currentFile: MD5Data;
        let oldFile: FileConfigData;
        for (let index = 0; index < this.fileMD5List.length; index++) {
            currentFile = this.fileMD5List[index];
            //老的列表中没有，说明是新的
            if (!this.oldFileConfigMap.has(currentFile.file)) {
                result.push({
                    file: currentFile.file,
                    quality: this.getQuality(assetsPath, currentFile.file),
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
                    quality: this.getQuality(assetsPath, currentFile.file),
                    md5:currentFile.md5
                }
                );
                continue;
            }
        }
        return result;
    }

    private __buildFileMD5(root: string, assetsPath: string, out: Array<MD5Data>): void {
        let fileList = fs.readdirSync(assetsPath);
        let filePath, status;
        let fileBuffer;
        let md5Code;
        let md5;
        let relativePath;
        let extname: string;
        let trueType:string;
        let info;

        for (let index = 0; index < fileList.length; index++) {
            filePath = assetsPath + "/" + fileList[index];
            status = fs.statSync(filePath);
            relativePath = path.relative(root, filePath);
            relativePath = relativePath.replace(/\\/g, "/");
            if (this.excludeMap.has(relativePath)) {
                continue;
            }
            if (status.isFile()) {
                extname = path.extname(filePath);
                extname = extname.toLocaleLowerCase();
                // if (extname != ".png" && extname != ".jpg") {
                if (extname != ".png") {
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
                this.__buildFileMD5(root, filePath, out);
            }
        }
    }
}

interface MD5Data {
    file: string;
    md5: string;
}

interface FileConfigData extends MD5Data {
    quality: string;
}

interface DefinitionConfig {
    defaultQuality: string;
    exclude: Array<string>;
    customs: Array<QualityData>;
}

interface QualityData {
    file: string;
    quality: string;
}