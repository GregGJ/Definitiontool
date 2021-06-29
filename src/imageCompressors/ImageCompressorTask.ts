
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import * as child_process from "child_process";
import { CMDData } from "../CMDData";
import { DrongoEvent } from "../drongo/events/DrongoEvent";
import { Task } from "../drongo/task/Task";
const images =require("../node_modules/images/index");


export class ImageCompressorTask extends Task{

    private __workIndex: number = 0;
    private __workCount: number = 10;

    constructor(){
        super();
    }

    start(data?:any):void{
        this.tryNexts();
    }

    private tryNexts(): void {
        if (this.imageList && this.imageList.length != 0) {
            let file: { file: string, md5: string, quality: string };
            let extname: string;
            while (this.__workIndex < this.__workCount&&this.imageList.length) {
                file = this.imageList.shift()!;
                this.__workIndex++;
                extname = path.extname(file.file);
                extname.toLocaleLowerCase();
                if (extname == ".png") {
                    this.__pngCompress(file);
                } else {
                    this.__jpgCompress(file);
                }
                console.log("图片压缩中："+this.imageList?.length);
            }
        } else {
            this.dispatchEvent(DrongoEvent.COMPLETE);
        }
    }

    private __pngCompress(file: { file: string, md5: string, quality: string }, speed: number = 3): void {
        let input: string = this.input + "/" + file.file;
        let output: string = this.output + "/" + file.file;

        //压缩产生的文件名
        let m_fileName: string = file.file.replace(".png", "") + "-m.png";

        let cmd: string = this.pngquantExe;
        cmd += " --quality " + file.quality;
        cmd += " --speed " + speed;
        cmd += " --force";
        cmd += " --ext -m.png";
        cmd += " " + input;

        var childProcess:child_process.ChildProcess=child_process.exec(cmd, (err, data) => {
            if (err) {
                if (err.message.indexOf("Not a PNG file") >= 0) {
                    console.warn("Not a PNG file "+file.file);
                } else {
                    this.mkDirbyFile(output);
                    fs.copyFileSync(input, output);
                    this.fileConfigs!.set(file.file, file);
                }
            } else {
                this.mkDirbyFile(output);
                fs.renameSync(this.input + "/" + m_fileName, output);
                this.fileConfigs!.set(file.file, file);
            }
            this.__workIndex--;
            childProcess.kill();
            this.tryNexts();
        });
    }

    private __jpgCompress(file:  { file: string, md5: string, quality: string }): void {
        let output: string = this.output + "/" + file.file;
        this.mkDirbyFile(output);
        let quality: number;
        if (file.quality.indexOf("-") >= 0) {
            let arr: Array<string> = file.quality.split("-");
            quality = Number(arr[0]);
        } else {
            quality = Number(file.quality);
        }
        images(this.input + "/" + file.file).save(output, { quality: quality });
        this.fileConfigs!.set(file.file, file);
        this.__workIndex--;
        this.tryNexts();
    }

    /**
     * 递归创建所有父级文件夹
     * @param file 
     */
    private mkDirbyFile(file: string) {
        file = path.resolve(file);
        file = file.replace(/\\/g, "/");
        const fileName = file.split("/")[file.split("/").length - 1];
        file = file.replace(fileName, "");
        fs.mkdirSync(file, { recursive: true });
    }

    private get fileConfigs():Map<string,{ file: string, md5: string, quality: string }>{
        return CMDData.data.fileConfigs;
    }

    private get pngquantExe():string{
        return CMDData.data.pngquantExe;
    }

    private get input():string{
        return CMDData.data.input;
    }

    private get output():string{
        return CMDData.data.output;
    }

    private get imageList(): Array<{file:string,md5:string,quality:string}>{
        return CMDData.data.imageList;
    }
}