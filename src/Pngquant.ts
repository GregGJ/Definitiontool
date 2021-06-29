import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import * as child_process from "child_process";

export class Pngquant {

    public static Png_Compress_exe: string = "D:/erciyuan/clientCS/GameWord/definitions/pngquant.exe";

    constructor() {
        
    }

    start(assetsPath: string, lowDefinitionAssets: string, file: { file: string, md5: string, quality: string }, speed: number = 3, callBack: Function): void {
        let input: string = assetsPath + "/" + file.file;
        let output: string = lowDefinitionAssets + "/" + file.file;

        //压缩产生的文件名
        let m_fileName: string = file.file.replace(".png", "") + "-m.png";

        let cmd: string = Pngquant.Png_Compress_exe;
        cmd += " --quality " + file.quality;
        cmd += " --speed " + speed;
        cmd += " --force";
        cmd += " --ext -m.png";
        cmd += " " + input;

        child_process.exec(cmd, (err, data) => {
            if (err) {
                if (err.message.indexOf("Not a PNG file") >= 0) {
                    console.log("警告！这个文件不是png,但后缀却是png:" + file.file);
                } else {
                    // console.log("压缩比不足！使用原文件:"+input);
                    this.mkDirbyFile(output);
                    fs.copyFileSync(input, output);
                }
            } else {
                this.mkDirbyFile(output);
                fs.renameSync(assetsPath + "/" + m_fileName, output);
            }
            callBack(file);
        });
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