import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import * as child_process from "child_process";
const images =require("../node_modules/images/index");

export class ImageCompressor {

    public static Png_Compress_exe: string = "D:/erciyuan/clientCS/GameWord/definitions/pngquant.exe";

    private __assetsPath?: string;
    private __LDAssetsPath?: string;
    private __fileList?: Array<{ file: string, md5: string, quality: string }>;

    private __workIndex: number = 0;
    private __workCount: number = 4;

    private __fileConfigMap?:Map<string,{ file: string, md5: string, quality: string }>;

    private __callBack?:Function;
    
    /**
     * 错误的文件
     */
    private __errorFiles:Array<string>;

    constructor() {
        this.__errorFiles=[];
    }

    start(assetsPath: string, 
        lowDefinitionAssets: string, 
        fileList: Array<{ file: string, md5: string, quality: string }>,
        fileConfigMap:Map<string,{ file: string, md5: string, quality: string }>,
        callBack:Function) {
        
        this.__assetsPath = assetsPath;
        this.__LDAssetsPath = lowDefinitionAssets;
        this.__fileList = fileList;
        this.__fileConfigMap=fileConfigMap;
        
        this.__callBack=callBack;

        this.__errorFiles.length=0;
        
        console.group("需要压缩的图片数量："+fileList.length);
        this.tryNexts();
    }

    private tryNexts(): void {
        if (this.__fileList && this.__fileList.length != 0) {
            let file: { file: string, md5: string, quality: string };
            let extname: string;
            while (this.__workIndex < this.__workCount) {
                file = this.__fileList.shift()!;
                this.__workIndex++;
                extname = path.extname(file.file);
                extname.toLocaleLowerCase();
                if (extname == ".png") {
                    this.__pngCompress(file);
                } else {
                    this.__jpgCompress(file);
                }
                console.log("图片压缩中："+this.__fileList?.length);
            }
        } else {
            if(this.__errorFiles.length){
                console.groupEnd();
                console.group("警告：检测到以下文件,非png文件后缀却为.png:");
                for (let index = 0; index < this.__errorFiles.length; index++) {
                    const element = this.__errorFiles[index];
                    console.log(element);
                }
                console.groupEnd();
            }
            //结束
            if(this.__callBack){
                this.__callBack();
            }
        }
    }

    private __pngCompress(file: { file: string, md5: string, quality: string }, speed: number = 3): void {
        let input: string = this.__assetsPath + "/" + file.file;
        let output: string = this.__LDAssetsPath + "/" + file.file;

        //压缩产生的文件名
        let m_fileName: string = file.file.replace(".png", "") + "-m.png";

        let cmd: string = ImageCompressor.Png_Compress_exe;
        cmd += " --quality " + file.quality;
        cmd += " --speed " + speed;
        cmd += " --force";
        cmd += " --ext -m.png";
        cmd += " " + input;

        var childProcess:child_process.ChildProcess=child_process.exec(cmd, (err, data) => {
            if (err) {
                if (err.message.indexOf("Not a PNG file") >= 0) {
                    this.__errorFiles.push(file.file);
                } else {
                    this.mkDirbyFile(output);
                    fs.copyFileSync(input, output);
                    this.__fileConfigMap!.set(file.file, file);
                }
            } else {
                this.mkDirbyFile(output);
                fs.renameSync(this.__assetsPath + "/" + m_fileName, output);
                this.__fileConfigMap!.set(file.file, file);
            }
            this.__workIndex--;
            childProcess.kill();
            this.tryNexts();
        });
    }

    private __jpgCompress(file:  { file: string, md5: string, quality: string }): void {
        let output: string = this.__LDAssetsPath + "/" + file.file;
        this.mkDirbyFile(output);
        let quality: number;
        if (file.quality.indexOf("-") >= 0) {
            let arr: Array<string> = file.quality.split("-");
            quality = Number(arr[0]);
        } else {
            quality = Number(file.quality);
        }
        images(this.__assetsPath + "/" + file.file).save(output, { quality: quality });
        this.__fileConfigMap!.set(file.file, file);
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
}