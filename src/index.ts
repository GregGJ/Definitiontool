
import path from "path";
import { CMDData } from "./CMDData";
import { DrongoEvent } from "./drongo/events/DrongoEvent";
import { ImageCompressorPipeline } from "./imageCompressors/ImageCompressorPipeline";
import { Pipeline } from "./Pipeline";


CMDData.data={};
CMDData.data.input="D:/erciyuan/clientCS/GameWord/assets";
CMDData.data.output="D:/erciyuan/clientCS/LowDefinition/assets";
CMDData.data.configPath="D:/erciyuan/clientCS/GameWord/definitions/definitionConfig.json";
CMDData.data.pngquantExe=path.parse(__dirname).dir+"/tools/pngquant.exe"

class Main{
    private pipeline:Pipeline;
    constructor(){
        this.pipeline=new Pipeline();
        this.pipeline.addTask(new ImageCompressorPipeline());
        this.pipeline.addEvent(DrongoEvent.COMPLETE,this,this.pipelineComplete);
        this.pipeline.start();
    }
    
    private pipelineComplete():void{
        // console.log(CMDData.data);
        process.exit();
    }
}

new Main();