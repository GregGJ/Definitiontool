# fileConfig.json

```json
[

    {

    	"file":"asset/xxx",
		"md5":"xxxxxxxxxxxxxxxxxxx",
        "quality":"80-90"
    }
]
```

对比得出是否需要重新压缩文件

# definitionConfig 参数详解：
```json
{
    //默认品质
    "defaultQuality":80,
    //排除列表
    "exclude":[
        "assets/xxxxxxxxx/xxxx"
    ],
    //自定义
    "customs":[
        {
            "file":"assets/xxxx",
            "quality":90
        }
    ]
}
```

