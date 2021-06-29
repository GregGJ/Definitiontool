

/**
 * 对象池
 */
export class Pool<T>
{
    /**创建方法*/
    private __createMethod?: (createData?: any) => T;
    /**池中闲置对象 */
    private __cacheStack: Array<T> = new Array<T>();
    /**正在使用的对象 */
    private __usingArray: Array<T> = new Array<T>();
    /**池中对象最大数 */
    private __maxCount: number = 0;
    /**重置时回调*/
    private __resetMethod?: (value: T) => void;
    /**销毁时回调*/
    private __destroyMethod?: (value: T) => void;

    constructor(createMethod: (createData?: any) => T, maxCount?: number, resetMethod?: (value: T) => void, destroyMethod?: (value: T) => void, initCount: number = 0) {
        this.__maxCount = maxCount == undefined ? 0 : maxCount;
        this.__createMethod = createMethod;
        this.__resetMethod = resetMethod;
        this.__destroyMethod = destroyMethod;

        if(this.__createMethod){
            for (var i = 0; i < initCount; i++) {
                this.__cacheStack.push(this.__createMethod());
            }
        }
    }

    /**
    * 在池中的对象
    */
    public get count(): number {
        return this.__cacheStack.length;
    }

    /**
     * 使用中的数量
     */
    public get usingCount(): number {
        return this.__usingArray.length;
    }

    /**
     * 分配
     * @returns 
     */
    public allocate(createData?: any): T {
        if (this.__createMethod === undefined) {
            throw new Error("工厂方法未定义!");
        }
        if (this.count + this.usingCount < this.__maxCount) {
            let element: T = this.__cacheStack.length > 0 ? this.__cacheStack.pop()! : this.__createMethod(createData);
            this.__usingArray.push(element);
            return element;
        }
        throw new Error("对象池最大数量超出：" + this.__maxCount);
    }

    /**
     * 回收到池中
     * @param obj 
     * @returns 
     */
    public recycle(obj: T): void {
        if (this.__cacheStack.indexOf(obj) > -1) {
            throw new Error("重复回收！");
        }
        let index = this.__usingArray.indexOf(obj);
        if (index < 0) {
            throw new Error("对象不属于改对象池！");
        }
        if (this.__resetMethod != null) {
            this.__resetMethod(obj);
        }
        this.__usingArray.splice(index, 1);
        this.__cacheStack.push(obj);
    }

    /**
     * 批量回收
     * @param list 
     */
    public recycleList(list: Array<T>): void {
        for (let index = 0; index < list.length; index++) {
            const element = list[index];
            this.recycle(element);
        }
    }

    /**
     * 将所有使用中的对象都回收到池中
     */
    public recycleAll(): void {
        for (let index = 0; index < this.__usingArray.length; index++) {
            const element = this.__usingArray[index];
            this.recycle(element);
        }
    }

    public destroy(): void {
        this.recycleAll();
        for (let index = 0; index < this.__cacheStack.length; index++) {
            const element = this.__cacheStack[index];
            if (this.__destroyMethod != null) {
                this.__destroyMethod(element);
            }
        }

        this.__cacheStack.length = 0;
        this.__cacheStack = null!;
        this.__usingArray.length = 0;
        this.__usingArray = null!;

        this.__resetMethod = undefined;
        this.__destroyMethod = undefined;
        this.__createMethod = undefined;
    }
}