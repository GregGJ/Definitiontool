
import { CMDData } from "./CMDData";
import { DrongoEvent } from "./drongo/events/DrongoEvent";
import { ImageCompressorPipeline } from "./imageCompressors/ImageCompressorPipeline";
import { Pipeline } from "./Pipeline";
import { CopyDirTask } from "./task/CopyDirTask";
import { SVNCommit } from "./task/SVNCommit";
import * as fs from "fs";
const log4js = require("log4js");
const program = require('commander');


program
    .version('0.0.1')
    .option('-i, --input [value]', 'SVN工程目录')
    .option('-p, --projectPath [value]', '零时低清工程目录')
    
program.parse(process.argv);

const options = program.opts();
console.log(options);

class Main {

    private pipeline?: Pipeline;
    constructor() {
        this.initLoger();
        this.start();
    }

    private initLoger(): void {
        log4js.configure({
            appenders: {
                std: {
                    type: "stdout",
                    level: "all",
                    layout: { type: "basic", }
                },
                file: {
                    type: 'file',
                    filename: 'access.log',
                    pattern: '-yyyy-MM-dd.log',
                    alwaysIncludePattern: true,
                    category: 'access'
                }
            },
            categories: {
                default: { appenders: ["std"], level: "debug" },
                custom: { appenders: ["std", "file"], level: "all" }
            }
        });
        CMDData.data.logger = log4js.getLogger("custom");
        CMDData.data.logger.level = "all";
        CMDData.data.logger.info("===============================================================================================================");
        CMDData.data.logger.info("start");
        CMDData.data.logger.info("===============================================================================================================");
    }

    private start(): void {
        this.pipeline = new Pipeline();
        //生成低清晰度文件
        this.pipeline.addTask(new ImageCompressorPipeline());
        //将低清晰度文件提交到SVN 方便下次生成加速
        this.pipeline.addTask(new SVNCommit(CMDData.data.input + "/definitions"))
        //将项目copy到工作项目空间
        this.pipeline.addTask(new CopyDirTask(CMDData.data.input, CMDData.data.projectPath, [
            ".vscode",
            "build",
            "definitions",
            "library",
            "local",
            "namespace",
            "temp"
        ]));
        //将低清晰度文件覆盖到工作项目空间
        this.pipeline.addTask(new CopyDirTask(
            CMDData.data.input + "/definitions/LowDefinition",
            CMDData.data.projectPath + "/assets", [
            "fileConfigs.json"
        ]))
        this.pipeline.addEvent(DrongoEvent.ERROR, this, this.pipelineError);
        this.pipeline.addEvent(DrongoEvent.COMPLETE, this, this.pipelineComplete);
        this.pipeline.start();
    }

    private pipelineError(type: string, target?: any, ...arg: any[]): void {
        CMDData.data.logger.error(arg);
    }

    private pipelineComplete(type: string, target?: any, ...arg: any[]): void {
        CMDData.data.logger.info("===============================================================================================================");
        CMDData.data.logger.info("end");
        CMDData.data.logger.info("===============================================================================================================");
    }
}

if (options.input && options.projectPath) {
    if (fs.existsSync(options.input)) {
        CMDData.data = {};
        CMDData.data.input = options.input;
        CMDData.data.projectPath = options.projectPath;
        new Main();
    } else {
        console.log("-i not exists");
    }
}else{
    if(!options.input){
        console.log("-input ==null");
    }else{
        console.log("-projectPath ==null");
    }
}
