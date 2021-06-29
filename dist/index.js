#!/usr/bin/env node
'use strict';

var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var child_process = require('child_process');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () {
                        return e[k];
                    }
                });
            }
        });
    }
    n['default'] = e;
    return Object.freeze(n);
}

var path__namespace = /*#__PURE__*/_interopNamespace(path);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var fs__namespace = /*#__PURE__*/_interopNamespace(fs);
var crypto__namespace = /*#__PURE__*/_interopNamespace(crypto);
var child_process__namespace = /*#__PURE__*/_interopNamespace(child_process);

class CMDData {
}

class DrongoEvent {
}
DrongoEvent.START = "DrongoEvent.start";
DrongoEvent.PROGRESS = "DrongoEvent.progress";
DrongoEvent.COMPLETE = "DrongoEvent.complete";
DrongoEvent.ERROR = "DrongoEvent.Error";

/**
 * 事件分发器(只有一对多的情况下去使用)
 */
class EventDispatcher {
    constructor() {
        /**
        * 对象已经注册的处理器
        */
        this.callerMap = new Map();
        /**
         * 事件派发器上所监听的处理器
         */
        this.keyMap = new Map();
    }
    /**
     * 添加事件
     * @param key
     * @param caller
     * @param func
     * @param priority 优先级（数字越小优先级越高）
     */
    addEvent(key, caller, handler, priority = 0) {
        let infoList;
        let info;
        if (this.keyMap.has(key)) {
            infoList = this.keyMap.get(key);
            for (const iterator of infoList) {
                if (iterator.target == caller && iterator.handler == handler) {
                    console.error("重复添加同一个事件监听：" + key + " " + caller + " " + handler);
                    return;
                }
            }
        }
        else {
            infoList = [];
            this.keyMap.set(key, infoList);
        }
        info = new EventInfo(key, caller, handler);
        infoList.push(info);
        //按照优先级排序
        infoList.sort((a, b) => a.priority - priority);
        //处理器关联处理
        if (this.callerMap.has(caller)) {
            infoList = this.callerMap.get(caller);
            for (const iterator of infoList) {
                if (iterator.key == key && iterator.handler == handler) {
                    console.error("事件系统 处理器关联错误：" + key + " " + caller + " " + handler);
                }
            }
        }
        else {
            infoList = [];
            this.callerMap.set(caller, infoList);
        }
        infoList.push(info);
    }
    /**
     * 删除事件监听
     * @param key
     * @param caller
     * @param handler
     */
    removeEvent(key, caller, handler) {
        if (this.keyMap.has(key) == false) {
            return;
        }
        let infoList = this.keyMap.get(key);
        let info;
        let deleteInfo = null;
        //删除
        for (let index = 0; index < infoList.length; index++) {
            info = infoList[index];
            if (info.target == caller && info.handler == handler) {
                deleteInfo = info;
                infoList.splice(index, 1);
                break;
            }
        }
        infoList = this.callerMap.get(caller);
        //删除
        for (let index = 0; index < infoList.length; index++) {
            info = infoList[index];
            if (info.key == key && info.handler == handler) {
                deleteInfo = info;
                infoList.splice(index, 1);
                break;
            }
        }
        //销毁处理器
        if (deleteInfo) {
            deleteInfo.destroy();
        }
    }
    /**
     * 删除指定对象所有的事件处理
     * @param caller
     */
    removeEventByCaller(caller) {
        let infoList = this.callerMap.get(caller);
        if (infoList === undefined || infoList.length == 0) {
            return;
        }
        let info;
        //逐个删除
        while (infoList.length) {
            info = infoList[0];
            this.removeEvent(info.key, info.target, info.handler);
        }
        //删除空列表
        this.callerMap.delete(caller);
    }
    /**
     * 删除所有事件监听
     */
    removeAllEvent() {
        this.keyMap.forEach(infoList => {
            infoList.forEach(info => {
                info.destroy();
            });
        });
        this.keyMap.clear();
        this.callerMap.clear();
    }
    /**
     * 派发事件
     * @param key
     * @param data
     */
    dispatchEvent(key, data) {
        if (this.keyMap.has(key) == false) {
            return;
        }
        let infoList = this.keyMap.get(key);
        let info;
        for (let index = 0; index < infoList.length; index++) {
            info = infoList[index];
            info.handler.apply(info.target, [key, this, data]);
        }
    }
    /**
     * 是否有事件监听
     * @param key
     */
    hasEvent(key) {
        return this.keyMap.has(key);
    }
    /**
     * 是否包含指定函数事件监听
     * @param key
     * @param caller
     * @param func
     */
    hasEventHandler(key, caller, func) {
        if (this.keyMap.has(key) == false) {
            return false;
        }
        let infoList = this.keyMap.get(key);
        let info;
        for (let index = 0; index < infoList.length; index++) {
            info = infoList[index];
            if (info.target == caller && info.handler == func) {
                return true;
            }
        }
        return false;
    }
    destroy() {
        this.callerMap.clear();
        this.keyMap.clear();
    }
}
class EventInfo {
    constructor(key, target, handler) {
        this.key = "";
        this.priority = 255;
        this.key = key;
        this.target = target;
        this.handler = handler;
    }
    destroy() {
    }
}

class Task extends EventDispatcher {
    /**
     * 开始
     * @param data
     */
    start(data) {
    }
    /**
     * 销毁
     */
    destroy() {
        this.removeAllEvent();
    }
}

/**
 * 任务队列
 */
class TaskQueue extends Task {
    constructor() {
        super();
        this.__index = 0;
        this.__taskList = [];
    }
    addTask(value) {
        if (this.__taskList.indexOf(value) >= 0) {
            throw new Error("重复添加！");
        }
        this.__taskList.push(value);
    }
    removeTask(value) {
        let index = this.__taskList.indexOf(value);
        if (index < 0) {
            throw new Error("未找到要删除的内容！");
        }
        this.__taskList.splice(index, 1);
    }
    start(data) {
        this.__index = 0;
        this.__tryNext();
    }
    __tryNext() {
        if (this.__index < this.__taskList.length) {
            let task = this.__taskList[this.__index];
            task.addEvent(DrongoEvent.COMPLETE, this, this.__subTaskEventHandler);
            task.addEvent(DrongoEvent.PROGRESS, this, this.__subTaskEventHandler);
            task.addEvent(DrongoEvent.ERROR, this, this.__subTaskEventHandler);
            task.start();
        }
        else {
            this.allComplete();
        }
    }
    allComplete() {
        //结束
        this.dispatchEvent(DrongoEvent.COMPLETE);
    }
    __subTaskEventHandler(key, target, data) {
        if (key == DrongoEvent.PROGRESS) {
            let progress = isNaN(data) ? (this.__index + data) / this.__taskList.length : this.__index / this.__taskList.length;
            this.dispatchEvent(DrongoEvent.PROGRESS, progress);
            return;
        }
        target.removeAllEvent();
        if (key == DrongoEvent.ERROR) {
            this.dispatchEvent(DrongoEvent.ERROR, data);
            return;
        }
        target.destroy();
        this.__index++;
        this.__tryNext();
    }
    destroy() {
        super.destroy();
        this.__taskList.length = 0;
        this.__index = 0;
    }
}

const imageinfo = require("imageinfo");
class CalculateImageMD5Task extends Task {
    constructor() {
        super();
        this.illegalFiles = [];
    }
    start() {
        let root = CMDData.data.input;
        let dir = root;
        let out = CMDData.data.fileMD5List = [];
        this.buildFileMD5(root, dir, out);
        // if(this.illegalFiles.length){
        //     this.dispatchEvent(DrongoEvent.ERROR,this.illegalFiles);
        // }else{
        this.dispatchEvent(DrongoEvent.COMPLETE);
        // }
    }
    buildFileMD5(root, dir, out) {
        let fileList = fs__namespace.readdirSync(dir);
        let filePath, status;
        let fileBuffer;
        let md5Code;
        let md5;
        let relativePath;
        let extname;
        let trueType;
        let info;
        for (let index = 0; index < fileList.length; index++) {
            filePath = dir + "/" + fileList[index];
            status = fs__namespace.statSync(filePath);
            relativePath = path__namespace.relative(root, filePath);
            relativePath = relativePath.replace(/\\/g, "/");
            if (this.excludeMap && this.excludeMap.has(relativePath)) {
                continue;
            }
            if (status.isFile()) {
                extname = path__namespace.extname(filePath);
                extname = extname.toLocaleLowerCase();
                // if (extname != ".png" && extname != ".jpg") {
                if (extname != ".png") {
                    continue;
                }
                if (filePath.indexOf("-m.") >= 0) {
                    continue;
                }
                fileBuffer = fs__namespace.readFileSync(filePath);
                md5 = crypto__namespace.createHash("md5");
                md5Code = md5.update(fileBuffer).digest().toString("hex");
                info = imageinfo(fileBuffer);
                //真实类型
                trueType = "." + info.format.toLocaleLowerCase();
                if (extname != trueType) {
                    this.illegalFiles.push("文件后缀" + extname + " 真实类型" + trueType + " " + relativePath);
                }
                else {
                    out.push({ file: relativePath, md5: md5Code });
                }
            }
            else {
                this.buildFileMD5(root, filePath, out);
            }
        }
    }
    get excludeMap() {
        return CMDData.data.excludeMap;
    }
}

/**
 * 计算有多少需要压缩的图片
 */
class CalculateImageListTask extends Task {
    constructor() {
        super();
    }
    start(data) {
        this.buildFileList();
    }
    buildFileList() {
        CMDData.data.input;
        let result = [];
        //对比MD5得出那些文件需要重新生成
        let currentFile;
        let oldFile;
        for (let index = 0; index < this.fileMD5List.length; index++) {
            currentFile = this.fileMD5List[index];
            //老的列表中没有，说明是新的
            if (!this.oldFileConfigMap.has(currentFile.file)) {
                result.push({
                    file: currentFile.file,
                    quality: this.getQuality(currentFile.file),
                    md5: currentFile.md5
                });
                continue;
            }
            oldFile = this.oldFileConfigMap.get(currentFile.file);
            //如果再自定义列表中
            if (this.customQualityMap.has(currentFile.file)) {
                const customQualtiy = this.customQualityMap.get(currentFile.file);
                //如果自定义品质和上次的品质不同则需要重新构建
                if (oldFile.quality != customQualtiy) {
                    result.push({
                        file: currentFile.file,
                        quality: customQualtiy,
                        md5: currentFile.md5
                    });
                    continue;
                }
            }
            oldFile = this.oldFileConfigMap.get(currentFile.file);
            //MD5不相同
            if (currentFile.md5 !== oldFile.md5) {
                result.push({
                    file: currentFile.file,
                    quality: this.getQuality(currentFile.file),
                    md5: currentFile.md5
                });
                continue;
            }
        }
        //赋值
        CMDData.data.imageList = result;
        console.log("经过计算本次需要处理：" + result.length + "个图片!");
        this.dispatchEvent(DrongoEvent.COMPLETE);
    }
    getQuality(fileRelativePath) {
        //如果直接找到了自定义品质
        if (this.customQualityMap.has(fileRelativePath)) {
            return this.customQualityMap.get(fileRelativePath);
        }
        //递归父容器是否定义了品质
        let dirName = path__namespace.dirname(fileRelativePath);
        while (true) {
            //如果父级文件夹定义了品质
            if (this.customQualityMap.has(dirName)) {
                return this.customQualityMap.get(dirName);
            }
            dirName = path__namespace.dirname(dirName);
            if (dirName == ".") {
                break;
            }
        }
        return CMDData.data.defaultQuality;
    }
    get fileMD5List() {
        return CMDData.data.fileMD5List;
    }
    get oldFileConfigMap() {
        return CMDData.data.fileConfigs;
    }
    get customQualityMap() {
        return CMDData.data.customQualityMap;
    }
}

const images = require("../node_modules/images/index");
class ImageCompressorTask extends Task {
    constructor() {
        super();
        this.__workIndex = 0;
        this.__workCount = 10;
    }
    start(data) {
        this.tryNexts();
    }
    tryNexts() {
        var _a;
        if (this.imageList && this.imageList.length != 0) {
            let file;
            let extname;
            while (this.__workIndex < this.__workCount && this.imageList.length) {
                file = this.imageList.shift();
                this.__workIndex++;
                extname = path__namespace.extname(file.file);
                extname.toLocaleLowerCase();
                if (extname == ".png") {
                    this.__pngCompress(file);
                }
                else {
                    this.__jpgCompress(file);
                }
                console.log("图片压缩中：" + ((_a = this.imageList) === null || _a === void 0 ? void 0 : _a.length));
            }
        }
        else {
            this.dispatchEvent(DrongoEvent.COMPLETE);
        }
    }
    __pngCompress(file, speed = 3) {
        let input = this.input + "/" + file.file;
        let output = this.output + "/" + file.file;
        //压缩产生的文件名
        let m_fileName = file.file.replace(".png", "") + "-m.png";
        let cmd = this.pngquantExe;
        cmd += " --quality " + file.quality;
        cmd += " --speed " + speed;
        cmd += " --force";
        cmd += " --ext -m.png";
        cmd += " " + input;
        var childProcess = child_process__namespace.exec(cmd, (err, data) => {
            if (err) {
                if (err.message.indexOf("Not a PNG file") >= 0) {
                    console.warn("Not a PNG file " + file.file);
                }
                else {
                    this.mkDirbyFile(output);
                    fs__namespace.copyFileSync(input, output);
                    this.fileConfigs.set(file.file, file);
                }
            }
            else {
                this.mkDirbyFile(output);
                fs__namespace.renameSync(this.input + "/" + m_fileName, output);
                this.fileConfigs.set(file.file, file);
            }
            this.__workIndex--;
            childProcess.kill();
            this.tryNexts();
        });
    }
    __jpgCompress(file) {
        let output = this.output + "/" + file.file;
        this.mkDirbyFile(output);
        let quality;
        if (file.quality.indexOf("-") >= 0) {
            let arr = file.quality.split("-");
            quality = Number(arr[0]);
        }
        else {
            quality = Number(file.quality);
        }
        images(this.input + "/" + file.file).save(output, { quality: quality });
        this.fileConfigs.set(file.file, file);
        this.__workIndex--;
        this.tryNexts();
    }
    /**
     * 递归创建所有父级文件夹
     * @param file
     */
    mkDirbyFile(file) {
        file = path__namespace.resolve(file);
        file = file.replace(/\\/g, "/");
        const fileName = file.split("/")[file.split("/").length - 1];
        file = file.replace(fileName, "");
        fs__namespace.mkdirSync(file, { recursive: true });
    }
    get fileConfigs() {
        return CMDData.data.fileConfigs;
    }
    get pngquantExe() {
        return CMDData.data.pngquantExe;
    }
    get input() {
        return CMDData.data.input;
    }
    get output() {
        return CMDData.data.output;
    }
    get imageList() {
        return CMDData.data.imageList;
    }
}

class ImageCompressorPipeline extends TaskQueue {
    constructor() {
        super();
        this.addTask(new CalculateImageMD5Task());
        this.addTask(new CalculateImageListTask());
        this.addTask(new ImageCompressorTask());
    }
    start(data) {
        this.__init();
        super.start(data);
    }
    allComplete() {
        if (CMDData.data.fileConfigs.size == 0) {
            throw new Error("没有发现任何图片！");
        }
        let list = [];
        let values = CMDData.data.fileConfigs.values();
        let next = values.next();
        while (!next.done) {
            list.push(next.value);
            next = values.next();
        }
        let jsonStr = JSON.stringify(list, null, 2);
        if (CMDData.data.fileRecordPath) {
            fs__namespace.writeFileSync(CMDData.data.fileRecordPath, jsonStr);
            console.log("fileConfigs.json保存完毕: " + CMDData.data.fileRecordPath);
        }
        super.allComplete();
    }
    __init() {
        //验证路径
        //先确定两个路径是否正确
        if (!fs__namespace.existsSync(CMDData.data.input) || !fs__namespace.existsSync(CMDData.data.output)) {
            throw new Error("input或output 文件夹不存在！");
        }
        let assetsStats = fs__namespace.statSync(CMDData.data.input);
        let assetsLDStats = fs__namespace.statSync(CMDData.data.output);
        if (!assetsStats.isDirectory() || !assetsLDStats.isDirectory()) {
            throw new Error("input或output 必须是文件夹");
        }
        //读取两个配置文件
        let configPath;
        if (CMDData.data.configPath) {
            configPath = CMDData.data.configPath;
        }
        else {
            configPath = path__namespace.parse(CMDData.data.input).dir + "/definitions/definitionConfig.json";
        }
        if (configPath) {
            if (fs__namespace.existsSync(configPath)) {
                let data = fs__namespace.readFileSync(configPath, "utf-8");
                CMDData.data.config = JSON.parse(data);
            }
        }
        //文件记录
        let fileRecordPath = CMDData.data.output + "/fileConfigs.json";
        let fileConfigList;
        if (fileRecordPath) {
            if (fs__namespace.existsSync(fileRecordPath)) {
                let data = fs__namespace.readFileSync(fileRecordPath, "utf-8");
                fileConfigList = JSON.parse(data);
            }
            CMDData.data.fileRecordPath = fileRecordPath;
        }
        //老的文件记录
        CMDData.data.fileConfigs = new Map();
        if (fileConfigList && fileConfigList.length) {
            let fileConfig;
            for (let index = 0; index < fileConfigList.length; index++) {
                fileConfig = fileConfigList[index];
                CMDData.data.fileConfigs.set(fileConfig.file, fileConfig);
            }
        }
        //解析清晰度配置
        this.__decodeDefinitionConfig();
    }
    __decodeDefinitionConfig() {
        //默认品质
        CMDData.data.defaultQuality = CMDData.data.config ? CMDData.data.config.defaultQuality : "80-90";
        //排除列表
        CMDData.data.excludeMap = new Map();
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
        CMDData.data.customQualityMap = new Map();
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

class Pipeline extends TaskQueue {
    constructor() {
        super();
    }
}

CMDData.data = {};
CMDData.data.input = "D:/erciyuan/clientCS/GameWord/assets";
CMDData.data.output = "D:/erciyuan/clientCS/LowDefinition/assets";
CMDData.data.configPath = "D:/erciyuan/clientCS/GameWord/definitions/definitionConfig.json";
CMDData.data.pngquantExe = path__default['default'].parse(__dirname).dir + "/tools/pngquant.exe";
class Main {
    constructor() {
        this.pipeline = new Pipeline();
        this.pipeline.addTask(new ImageCompressorPipeline());
        this.pipeline.addEvent(DrongoEvent.COMPLETE, this, this.pipelineComplete);
        this.pipeline.start();
    }
    pipelineComplete() {
        // console.log(CMDData.data);
        process.exit();
    }
}
new Main();
