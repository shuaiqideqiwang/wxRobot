const { json } = require('body-parser');
const express = require('express');

const route = express.Router();
const request = require('request');
var xmldoc = require('xmldoc');
// wxid_m9zkl6flluox22
var mywxid = "wxid_xxxxxxxxxxxxx"; //机器人wxid
var url = "http://127.0.0.1:7777/DaenWxHook/httpapi/?wxid=" + mywxid;
var path = "DaenWxHook/httpapi/"

route.post('/', (req, res) => {
    // 对数据进行监听，数据一旦改变就进行操作
    req.on("data", function (data) {
        try {
            // 对获取到的数据进行加工
            var params = JSON.parse(data.toString());
        } catch (error) {
            console.log(error);
            console.log(data);
            return;
        }

        switch (params.event) {
            case 10006: //转账事件，自动收款
                if (params.data.data.msgSource == "1") {
                    receiveMoney({
                        "type": "Q0016",
                        "data": {
                            "wxid": params.data.data.fromWxid,
                            "transferid": params.data.data.transferid,
                        }
                    })
                }
                break;
            case 10007://二维码收款事件
                var re = /收款金额￥.+/;
                var data = params.data.data.msg;
                var result = data.match(re);
                console.log(result[0].split("￥")[1]); //打印收款金额
                break;
            case 10008://群聊消息自动回复
                sendMessage({
                    "type": "Q0001",
                    "data": {
                        "wxid": params.data.data.fromWxid,
                        "msg": "你好\r我是微信Robot\r我叫卷栗" //这里是回复内容 \r和\n是换行符
                    }
                })
                break;
            case 10009: //好友消息自动回复事件
                if (params.data.data.msgType == "1" && params.data.data.fromType == "1") {
                    /* 在这里我们将会使用rquest请求帮助我们获取到OpenAI的数据 */
                    console.log("有人发消息了", params.data.data.msg);
                    openai(params.data.data.msg, params)
                    // 如果是文本消息并且是私聊
                    sendMessage({
                        "type": "Q0001",
                        "data": {
                            "wxid": params.data.data.fromWxid,
                            "msg": "思考..." //这里是回复内容 \r和\n是换行符
                        }
                    })
                }
                break;
            case 10011://加好友秒通过
                agreeFriend({
                    "type": "Q0017",
                    "data": {
                        "scene": params.data.data.scene,
                        "v3": params.data.data.v3,
                        "v4": params.data.data.v4
                    }
                })
                // setUserinfo({ wxid: params.data.data.wxid })
                break;
            case 10013: if (params.data.data.msgSource == "1" && params.data.data.fromType == "1") {
                // 假如别人要撤回消息
                sendMessage({
                    "type": "Q0001",
                    "data": {
                        "wxid": mywxid,//发送给自己保存
                        "msg": params.data.data.msg //这里是别人撤回的信息
                    }
                })
            }
                break;
            default:
                break;
        }
        res.send({
            stateCode: 200,
        })
    });

})






/*********函数区**********/
function sendMessage(senddata) { //发送消息
    var options = {
        url: url,
        path: path,
        method: 'POST',
        body: JSON.stringify(senddata)
    };
    request.post(options);
}

function receiveMoney(senddata) { //接收转账
    var options = {
        url: url,
        path: path,
        method: 'POST',
        body: JSON.stringify(senddata)
    };
    request.post(options)
}

function agreeFriend(senddata) { //通过好友申请
    var options = {
        url: url,
        path: path,
        method: 'POST',
        body: JSON.stringify(senddata)
    };
    request.post(options)
}

function openai(sendData, params) {
    console.log("函数执行1");
    var options = {
        url: "https://api.openai-proxy.com/v1/chat/completions",
        method: 'POST',
        headers: {
            "Authorization": 'Bearer yourkey',//这里的yourkey指的是你的ChatGPTapi，需要的可以联系我
            "Content-Type": 'application/json',

        },
        body: JSON.stringify({
            "model": "gpt-3.5-turbo",
            "messages": [{ "role": "user", "content": `${sendData}` }]
        })
    }
    request(options, function (error, response, body) {
        if (error) { // 如果有错误，打印错误信息
            console.error(error);
        } else { // 如果没有错误，打印响应状态码和响应体
            console.log(response.statusCode);
            console.log(body);
            let newbody = JSON.parse(body)
            console.log(newbody.choices[0].message.content);
            sendMessage({
                "type": "Q0001",
                "data": {
                    "wxid": params.data.data.fromWxid,
                    "msg": `${newbody.choices[0].message.content}` //这里是回复内容 \r和\n是换行符
                }
            })

        }
    });

}
function getUserinfo(senddata) { //获取用户信息
    var options = {
        url: api + "/getWx_userinfo",
        path: path,
        method: 'POST',
        body: JSON.stringify(senddata)
    };
    request.post(options, function (error, response, body) {
        if (error) {
            console.log(error);
            return;
        }
        var data = JSON.parse(body);
        console.log(data.message[0].invite_wxid);
    })
}


function searchUserinfo(senddata) { //在好友列表搜索好友的信息,匹配用户名称并返回wxid
    var options = {
        url: url,
        path: path,
        method: 'POST',
        body: JSON.stringify({
            "type": "Q0005",
            "data": {
                "type": "1"
            }
        })
    };
    request.post(options, function (error, response, body) {
        if (error) {
            console.log(error);
            return;
        }
        var data = JSON.parse(body).result;

        for (let index = 0; index < data.length; index++) {
            if (data[index].nick == senddata.nickname) {
                setInvite({ wxid: data[index].wxid, invite_wxid: senddata.invite_wxid });
            }

        }
    })
}
  function searchWxid(wxid) { //在好友列表搜索好友的信息,匹配用户名称并返回wxid
    var options = {
        url: url,
        path: path,
        method: 'POST',
        body: JSON.stringify({
            "type": "Q0005",
            "data": {
                "type": "1"
            }
        })
    };
    request.post(options, function (error, response, body) {
        if (error) {
            console.log(error);
            return;
        }
        var data = JSON.parse(body).result;

        for (let index = 0; index < data.length; index++) {
            if (data[index].wxid == wxid) {
                console.log(data[index].nick);

            }

        }
    })
} 


module.exports = route;
