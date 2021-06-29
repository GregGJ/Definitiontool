
import path from "path";
import { CMDData } from "./CMDData";
import { DrongoEvent } from "./drongo/events/DrongoEvent";
import { ImageCompressorPipeline } from "./imageCompressors/ImageCompressorPipeline";
import { Pipeline } from "./Pipeline";


CMDData.data={};
CMDData.data.input="D:/erciyuan/clientCS/GameWord";


class Main{
    private pipeline:Pipeline;
    constructor(){
        this.pipeline=new Pipeline();
        this.pipeline.addTask(new ImageCompressorPipeline());
        this.pipeline.addEvent(DrongoEvent.ERROR,this,this.pipelineError);
        this.pipeline.addEvent(DrongoEvent.COMPLETE,this,this.pipelineComplete);
        this.pipeline.start();
    }

    private pipelineError(type: string, target?: any, ...arg: any[]):void{
        console.log(arg);
        process.exit();
    }
    
    private pipelineComplete(type: string, target?: any, ...arg: any[]):void{
        console.log(CMDData.data);
        process.exit();
    }
}

new Main();