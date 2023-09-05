const express = require('express');//已经下载的内容直接使用
const chat=require('./api/chat.cjs')//引入外部的文件等一会使用中间件帮助我们使用
const cors=require('cors')//解决所有的跨域请求
const app=express()//获取express的操作对象
app.use(chat)//使用外部文件
app.use(cors())//引入了就要调用
app.use('public',express.static('public'))//设置默认的静态路径
const serverHost = '127.0.0.1'; // 改为服务器的 IP 地址
var server= app.listen(8805,serverHost,function(){console.log("原神启动");})//我们监听端口8805的一切请求