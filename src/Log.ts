const iconv = require("iconv-lite");


/**
 * 用于解决中文乱码问题
 * @param str
 * @returns
 */
export function cnlog(str:string):string{
    return iconv.decode(Buffer.from(str, 'binary'), 'cp936');
}