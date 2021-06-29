import { TickManager } from "../tick/TickManager";

/**
 * 数据绑定工具
 */
export class Binding {

    /**
     * 数据绑定
     * @param source 
     * @param property 
     * @param targetOrCallBack 
     * @param tPropertyOrCaller 
     */
    static bind(source: any, property: string | Array<string>, targetOrCallBack: any | Function, tPropertyOrCaller: string | any): void {
        let binder: Binder = source["$binder"];
        if (!binder) {
            binder = new Binder(source);
            source["$binder"] = binder;
        }
        //函数绑定方式
        if (typeof targetOrCallBack === "function") {
            if (!Array.isArray(property)) {
                property = [property];
            }
            binder.bindCallBack(property, targetOrCallBack, tPropertyOrCaller);
        } else {
            if (Array.isArray(property)) {
                throw new Error("属性对属性绑定时不能为多项！");
            }
            binder.bindProperty(property, targetOrCallBack, tPropertyOrCaller);
        }
    }

    /**
     * 取消数据绑定
     * @param source 
     * @param property 
     * @param targetOrCallBack 
     * @param tPropertyOrCaller 
     * @returns 
     */
    static unbind(source: any, property: string | Array<string>, targetOrCallBack: any | Function, tPropertyOrCaller: string | any): void {
        let binder: Binder = source["$binder"];
        if (!binder) {
            return;
        }
        //函数绑定的方式
        if (Array.isArray(property)) {
            binder.unbindCallBack(property, targetOrCallBack, tPropertyOrCaller);
        } else {//属性绑定的方式
            binder.unbindProperty(property, targetOrCallBack, tPropertyOrCaller);
        }
    }

    /**
     * 函数钩子
     */
    static addHook(data: any, functionName: string, preHandlers: Array<Function>, laterHandlers: Array<Function>): void {
        let hook: Hook = data["$hook"];
        if (!hook) {
            hook = new Hook(data);
            data["$hook"] = hook;
        }
        hook.addHook(functionName, preHandlers, laterHandlers);
    }

    /**
     * 函数钩子解绑
     */
    static removeHook(data: any, functionName: string, preHandlers: Array<Function>, laterHandlers: Array<Function>): void {
        let hook: Hook = data["$hook"];
        if (!hook) {
            return;
        }
        hook.removeHook(functionName, preHandlers, laterHandlers);
    }
}

class Hook {

    dataView: any;

    /**
     * 已添加好钩子的方法
     */
    private __functions: Array<string>;

    private __preHandlerMap: Map<string, Array<Function>>;
    private __laterHandlerMap: Map<string, Array<Function>>;

    constructor(dataView: any) {
        this.dataView = dataView;
        this.__functions = [];
        this.__preHandlerMap = new Map<string, Array<Function>>();
        this.__laterHandlerMap = new Map<string, Array<Function>>();
    }

    removeHook(functionName: string, preHandlers: Array<Function>, laterHandlers: Array<Function>): void {
        //如果连钩子记录都没有！
        if (this.__functions.indexOf(functionName) < 0) {
            return;
        }
        let pres: Array<Function> | undefined = this.__preHandlerMap.get(functionName);
        let fIndex: number;
        if (pres && pres.length) {
            for (let index = 0; index < preHandlers.length; index++) {
                const element = preHandlers[index];
                fIndex = pres.indexOf(element);
                if (fIndex >= 0) {
                    pres.splice(fIndex, 1);
                    index--;
                }
            }
        }
        let laters: Array<Function> | undefined = this.__laterHandlerMap.get(functionName);
        if (laters && laters.length) {
            for (let index = 0; index < laterHandlers.length; index++) {
                const element = laterHandlers[index];
                fIndex = laters.indexOf(element);
                if (fIndex >= 0) {
                    laters.splice(fIndex, 1);
                    index--;
                }
            }
        }
    }

    /**
     * 添加钩子
     * @param functionName 
     * @param preHandlers 
     * @param laterHandlers 
     */
    addHook(functionName: string, preHandlers: Array<Function>, laterHandlers: Array<Function>): void {
        //如果没有添加好钩子
        if (this.__functions.indexOf(functionName) < 0) {
            let oldFun: Function = this.dataView[functionName];
            if (!oldFun) {
                throw new Error("方法不存在！");
            }
            let pres: Array<Function> | undefined = this.__preHandlerMap.get(functionName);
            if (!pres) {
                pres = [];
                this.__preHandlerMap.set(functionName, pres);
            }
            let laters: Array<Function> | undefined = this.__laterHandlerMap.get(functionName);
            if (!laters) {
                laters = [];
                this.__laterHandlerMap.set(functionName, laters);
            }
            let newFun: Function = function (): void {
                //pre
                if (pres && pres.length) {
                    for (let index = 0; index < pres.length; index++) {
                        const element = pres[index];
                        element();
                    }
                }
                //old
                oldFun();
                //later
                if (laters && laters.length) {
                    for (let index = 0; index < laters.length; index++) {
                        const element = laters[index];
                        element();
                    }
                }
            }
            this.dataView[functionName] = newFun;
            this.dataView["old_" + functionName] = oldFun;
            this.__functions.push(functionName);
        }
        let pres: Array<Function> | undefined = this.__preHandlerMap.get(functionName);
        if (!pres) {
            pres = [];
            this.__preHandlerMap.set(functionName, pres);
        }
        for (let index = 0; index < preHandlers.length; index++) {
            const element = preHandlers[index];
            if (pres.indexOf(element) < 0) {
                pres.push(element);
            }
        }
        let laters: Array<Function> | undefined = this.__laterHandlerMap.get(functionName);
        if (!laters) {
            laters = [];
            this.__laterHandlerMap.set(functionName, laters);
        }
        for (let index = 0; index < laterHandlers.length; index++) {
            const element = laterHandlers[index];
            if (laters.indexOf(element) < 0) {
                laters.push(element);
            }
        }
    }
}

/**
 * 数据绑定器
 */
class Binder {

    dataView: any;

    /**
     * 代理过的数据
     */
    private __propertys: Array<string>;

    /**
     * 属性改变列表
     */
    private __changedPropertys: Array<string> = [];

    /**
     * 已绑定的属性
     */
    private __bindPropsMap: Map<string, Array<{ target: any, propertyKey: string }>>;

    /**
     * 已绑定的回调
     */
    private __bindCallBacks: Map<string, Array<BindingCallBack>>;

    constructor(dataView: any) {

        this.dataView = dataView;

        this.__propertys = [];

        this.__bindCallBacks = new Map<string, Array<BindingCallBack>>();
        this.__bindPropsMap = new Map<string, Array<{ target: any, propertyKey: string }>>();
    }

    /**
     * 绑定
     * @param propertyKey 
     * @param target 
     */
    bindProperty(propertyKey: string, target: any, tProperty: string): void {
        this.__checkProperty(propertyKey);
        //检测属性
        let propertylist: Array<{ target: any, propertyKey: string }> | undefined = this.__bindPropsMap.get(propertyKey);
        if (!propertylist) {
            propertylist = [];
            this.__bindPropsMap.set(propertyKey, propertylist);
        }
        let exist: boolean = false;
        for (let index = 0; index < propertylist.length; index++) {
            const element = propertylist[index];
            //已经存在
            if (element.target = target && element.propertyKey == tProperty) {
                exist = true;
                return;
            }
        }
        if (!exist) {
            propertylist.push({ target: target, propertyKey: tProperty });
        }
    }

    /**
     * 绑定单项/多项属性到一个回调方法
     * @param propertys
     * @param callBack
     */
    bindCallBack(propertys: Array<string>, callBack: Function, caller: any): void {
        let propertyKey: string;
        let callBackList: Array<BindingCallBack> | undefined;
        let bindingCallBack: BindingCallBack;
        for (let index = 0; index < propertys.length; index++) {
            propertyKey = propertys[index];
            //检测属性绑定信息
            this.__checkProperty(propertyKey);

            bindingCallBack = new BindingCallBack(propertys, callBack, caller);

            callBackList = this.__bindCallBacks.get(propertyKey);
            if (!callBackList) {
                callBackList = [];
                this.__bindCallBacks.set(propertyKey, callBackList);
            }
            let exist: boolean = false;
            for (let index = 0; index < callBackList.length; index++) {
                const element = callBackList[index];
                //存在
                if (element.equal(bindingCallBack)) {
                    exist = true;
                    break;
                }
            }
            //不存在
            if (!exist) {
                callBackList.push(bindingCallBack);
            }
        }
    }

    /**
     * 检测属性
     * @param propertyKey 
     */
    private __checkProperty(propertyKey: string): void {
        let index: number = this.__propertys.indexOf(propertyKey);
        //如果没有绑定过这个数据
        if (index < 0) {
            //数据绑定实现
            let value: any = this.dataView[propertyKey];
            this.__defineReactive(this.dataView, propertyKey, value);
            this.__propertys.push(propertyKey);
        }
    }


    private __propertyChanged(pKey: string): void {
        //标记改变
        if (this.__changedPropertys.indexOf(pKey) < 0) {
            this.__changedPropertys.push(pKey);
            TickManager.callNextFrame(this.__nextFramePropertyUpdate, this);
        }
    }

    private __nextFramePropertyUpdate(): void {
        let pKey: string;
        let callBacks: Array<Function> = [];
        for (let propsIndex = 0; propsIndex < this.__changedPropertys.length; propsIndex++) {
            pKey = this.__changedPropertys[propsIndex];
            this.__updateProperty(pKey);
            this.__checkCallBack(pKey, callBacks);
        }
        this.__changedPropertys.length = 0;
        //回调
        if (callBacks.length) {
            for (let index = 0; index < callBacks.length; index++) {
                const element = callBacks[index];
                element();
            }
        }
        callBacks.length = 0;
    }

    /**
     * 属性更新
     * @param pKey 
     */
    private __updateProperty(pKey: string): void {
        let propertyList: Array<{ target: any, propertyKey: string }> | undefined = this.__bindPropsMap.get(pKey);
        if (propertyList && propertyList.length) {
            let target: { target: any, propertyKey: string };
            for (let index = 0; index < propertyList.length; index++) {
                target = propertyList[index];
                target.target[target.propertyKey] = this.dataView[pKey];
            }
        }
    }

    private __checkCallBack(pKey: string, callBacks: Array<Function>): void {
        let callBackList: Array<BindingCallBack> | undefined = this.__bindCallBacks.get(pKey);
        let callBack: Function;
        if (callBackList && callBackList.length) {
            for (let index = 0; index < callBackList.length; index++) {
                const element = callBackList[index];
                callBack = element.callBack;
                //重复性过滤
                if (callBacks.indexOf(callBack) < 0) {
                    callBacks.push(callBack);
                }
            }
        }
    }

    /**定义 */
    private __defineReactive(data: any, key: string, value: any): void {
        let self = this;
        Object.defineProperty(data, key, {
            enumerable: true,
            configurable: true,
            get: function (): any {
                return value;
            },
            set: function (newValue: any) {
                if (value == newValue) {
                    return;
                }
                self.__propertyChanged(key);
                // console.log("绑定数据改变：", value, newValue);
                value = newValue;
            },
        })
    }


    /**
     * 取消属性绑定
     * @param propertyKey 
     * @param target
     */
    unbindProperty(propertyKey: string, target: any, tPropertyKey: string): void {
        let properytList: Array<{ target: any, propertyKey: string }> | undefined = this.__bindPropsMap.get(propertyKey);
        if (properytList && properytList.length) {
            for (let index = 0; index < properytList.length; index++) {
                const element = properytList[index];
                if (element.target === target && element.propertyKey === tPropertyKey) {
                    properytList.splice(index, 1);
                    return;
                }
            }
        }
        if (properytList && properytList.length == 0) {
            this.__bindPropsMap.delete(propertyKey);
        }
    }

    /**
     * 取消函数绑定
     * @param property
     * @param callBack 
     * @param caller 
     */
    unbindCallBack(property: Array<string>, callBack: Function, caller: any): void {
        let propertyKey: string;
        let callBackList: Array<BindingCallBack> | undefined;
        let callBackInfo: BindingCallBack;

        for (let pIndex = 0; pIndex < property.length; pIndex++) {
            propertyKey = property[pIndex];

            callBackList = this.__bindCallBacks.get(propertyKey);
            if (callBackList && callBackList.length) {
                //删除关联
                for (let callBackIndex = 0; callBackIndex < callBackList.length; callBackIndex++) {
                    callBackInfo = callBackList[callBackIndex];
                    if (callBackInfo.equalValue(property, callBack, caller)) {
                        callBackList.splice(callBackIndex, 1);
                        callBackIndex--;
                    }
                }
            }
            if (callBackList && callBackList.length == 0) {
                this.__bindCallBacks.delete(propertyKey);
            }
        }
    }
}

class BindingCallBack {

    propertys: Array<string>;
    callBack: Function;
    caller: any;

    constructor(propertys: Array<string>, callBack: Function, caller: any) {
        this.propertys = propertys;
        this.callBack = callBack;
        this.caller = caller;
    }

    /**
     * 相等
     * @param b 
     * @returns 
     */
    equal(b: BindingCallBack): boolean {
        return this.equalValue(b.propertys, b.callBack, b.caller);
    }

    equalValue(propertys: Array<string>, callBack: Function, caller: any): boolean {
        if (this.propertys.length != propertys.length) {
            return false;
        }
        for (let index = 0; index < this.propertys.length; index++) {
            const element = this.propertys[index];
            if (propertys.indexOf(element) < 0) {
                return false;
            }
        }
        if (this.caller !== caller) {
            return false;
        }
        if (this.callBack !== callBack) {
            return false;
        }
        return true;
    }
}