<template>
  <div ref="script_base_info">
    <fieldset>
      <legend>用例信息</legend>
      <div>
        <label for="usecaseName">用例名:</label>
        <textarea id="usecaseName">{{scriptBaseInfo != null ? scriptBaseInfo['usecaseName'] : '无'}}</textarea>
      </div>
      <div>
        <label for="usecaseDescription">用例描述:</label>
        <textarea id="usecaseDescription">{{scriptBaseInfo != null ? scriptBaseInfo['usecaseDescription'] : '无'}}</textarea>
      </div>
    </fieldset>

    <fieldset>
      <legend>脚本信息</legend>
      <div>
        <label for="scriptName">脚本名:</label>
        <textarea id="scriptName">{{scriptBaseInfo != null ? scriptBaseInfo['scriptName'] : '无'}}</textarea>
      </div>
      <div>
        <label for="scriptDescription">脚本描述:</label>
        <textarea id="scriptDescription">{{scriptBaseInfo != null ? scriptBaseInfo['scriptDescription'] : '无'}}</textarea>
      </div>
      <div>
        <label for="version">脚本版本号</label>
        <textarea id="version">{{scriptBaseInfo != null ? scriptBaseInfo['version'] : '无'}}</textarea>
      </div>
    </fieldset>
  </div>
  <div ref="script_data_info">
    <table class="table">
      <thead>
      <tr>
        <th>执行脚本内容</th>
        <th>执行脚本信息</th>
      </tr>
      </thead>
      <tbody>
      <!-- 根据 dataLines 渲染每一行 -->
      <tr v-for="(line, index) in scriptBaseInfo.dataLines" :key="index">
        <td>{{ line }}</td>
        <td>
          <div>
            <div><strong>开始时间:</strong> {{ scriptLog[index]?.startTime || '无' }}</div>
            <div><strong>结束时间:</strong> {{ scriptLog[index]?.endTime || '无' }}</div>
            <div><strong>状态:</strong> {{ scriptLog[index]?.status || '未执行' }}</div>
            <p><strong>执行信息:</strong> {{ scriptLog[index]?.executeInfo || '无' }}</p>
          </div>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
//0. 连接socket。应当为一个请求一个socket连接。互不影响。
//1. 展示基础信息；后端请求返回得到脚本相关信息
//2. 发起开始执行请求；
//3. 根据返回的信息动态渲染log信息。

import axios from 'axios';
import {initWebSocket, sendMessage, webSocket} from "../js/websocket.js";
import {reactive} from "vue";

let scriptLogData = [];
let scriptLog;

let scriptIdFromUrl;


export default {
  setup(){
    const scriptBaseInfo = reactive({
      usecaseName: '',
      usecaseDescription: '',
      scriptName: '',
      scriptDescription: '',
      version: '',
      dataLines: [],
    });

    scriptIdFromUrl = getScriptId();
    //请求并获取脚本基础信息
    if(scriptIdFromUrl!=null){
      try {
        fetchScriptBaseInfo().then(
            (data) =>{
              const temp = data['data'];
              console.log(temp)
              scriptBaseInfo.usecaseName=temp.usecaseName;
              scriptBaseInfo.usecaseDescription=temp.usecaseDescription;
              scriptBaseInfo.scriptName=temp.scriptName;
              scriptBaseInfo.scriptDescription=temp.scriptDescription;
              scriptBaseInfo.version=temp.version;
              temp.data.split('\n').map(
                  line => {
                    line.trim()
                    if(line.length > 0){
                      scriptBaseInfo.dataLines.push(line);
                    }
                  }
              );
              console.log(scriptBaseInfo)
            }
        )
        console.log(scriptBaseInfo)
      }catch(e){
        window.alert("fetch script info fail");
        return;
      }
    } else {
      window.alert("scriptId is null");
      return;
    }
    //初始化websocket连接。
    try {
      initWebSocket("ws://127.0.0.1:8080/websocket", onWebsocketMessageRecvCallback);
    }catch(e){
      window.alert("websocket connect failed");
      return;
    }
    scriptLog = reactive(scriptLogData);
    return {
      scriptLog,
      scriptBaseInfo,
    }
  },
  mounted() {
    //基于websocket提示对端开始执行脚本
    webSocket.addEventListener('open', function () {
      let startFeatureRequest = {
        msgType:"process",
        contentType:"script_start",
        content:{
          "scriptId": scriptIdFromUrl.value,
        }
      };
      sendMessage(startFeatureRequest);
    });
  },
}

function getScriptId(){
  const path = window.location.href;
  const idNV = path.split('?');
  if(idNV.length <= 1){
    return null;
  }
  const scriptId = idNV[idNV.length-1].split('=')
  if(scriptId.length <= 1){
    return null;
  }
  return scriptId[scriptId.length-1];
}

async function fetchScriptBaseInfo(){
  let res;
  await axios.get(`http://127.0.0.1:8080/script/testInfo?scriptId=${scriptIdFromUrl}`).then(
      r =>{ res = r }
  );
  return res.data;
}

function onWebsocketMessageRecvCallback(jsonMessage){
  let msgType = jsonMessage['msgType'];
  let jsonObject = JSON.parse(jsonMessage["content"]);

  if(msgType === 'executeInfos') {
    scriptLog[jsonObject["featureId"]].scenarios[jsonObject["scenarioId"]].steps[jsonObject["stepId"]].executeInfo = jsonObject["errorMsg"];
    scriptLogData[jsonObject["featureId"]].scenarios[jsonObject["scenarioId"]].steps[jsonObject["stepId"]].status = jsonObject["status"];
    scriptLogData[jsonObject["featureId"]].scenarios[jsonObject["scenarioId"]].steps[jsonObject["stepId"]].startTime = jsonObject["startTime"];
    scriptLogData[jsonObject["featureId"]].scenarios[jsonObject["scenarioId"]].steps[jsonObject["stepId"]].endTime = jsonObject["endTime"];
  }
  else {
    console.log("other type hasn't complete yet");
  }
}

</script>

<style scoped>
/* 可添加样式 */
button {
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
}
</style>