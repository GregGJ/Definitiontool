
import path from "path";
import { CMDData } from "./CMDData";
import { DrongoEvent } from "./drongo/events/DrongoEvent";
import { ImageCompressorPipeline } from "./imageCompressors/ImageCompressorPipeline";
import { Pipeline } from "./Pipeline";
const log4js = require("log4js");


CMDData.data = {};
CMDData.data.input = "D:/erciyuan/clientCS/GameWord";


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

    private start():void{
        this.pipeline = new Pipeline();
        this.pipeline.addTask(new ImageCompressorPipeline());
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

new Main();