<template>
  <div>
    <a>pathid={{pathdata}}</a>
  </div>
  <div ref="script_base_info">

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
      <!-- 根据 data 行数动态渲染表格行 -->
      <tr v-for="(line, index) in dataLines" :key="index">
        <td>{{ line }}</td>
        <td><div>
          <p><strong>执行信息:</strong> {{ scriptLog[index]?.executeInfo || '无' }}</p>
          <p><strong>状态:</strong> {{ scriptLog[index]?.status || '无' }}</p>
          <p><strong>开始时间:</strong> {{ scriptLog[index]?.startTime || '无' }}</p>
          <p><strong>结束时间:</strong> {{ scriptLog[index]?.endTime || '无' }}</p>
        </div></td>
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
export default {
  data(){
    return {
      scriptIdFromUrl: null,
      scriptBaseInfo: null,
      err: null,

      scriptData: null,
    }

  },
  computed:{
    dataLines() {
      return this.scriptData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    }
  },
  components: {

  },

  setup(){
    this.scriptIdFromUrl = getScriptId();
    //请求并获取脚本基础信息
    if(this.scriptIdFromUrl!=null){
      fetchScriptBaseInfo();
    } else {
      this.err = "scriptId is null"
    }
    //初始化websocket连接。
    initWebSocket("ws://127.0.0.1:8080/websocket", onWebsocketMessageRecvCallback);
    scriptLog = reactive(scriptLogData);
    return {
      scriptLog,
    }
  },
  mounted() {
    //渲染对应信息；
    displayScriptBaseInfo();
    //基于websocket提示对端开始执行脚本
    webSocket.addEventListener('open', function () {
      let startFeatureRequest = {
        msgType:"process",
        contentType:"script_start",
        content:{
          scriptId:this.scriptId
        }
      };
      sendMessage(startFeatureRequest);
    });
  },

  methods: {
  }
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

function fetchScriptBaseInfo(){
  axios.get(`http://127.0.0.1:8080/script/baseInfo?scriptId=${this.scriptIdFromUrl}`)
      .then(res=>{
        this.scriptBaseInfo = res;
      }).catch(err=> {
        this.err = err;
      });
}

//实在得不到数据的话看`http://127.0.0.1:8080/script/baseInfo?scriptId=${this.scriptIdFromUrl}`这种格式。
function displayScriptBaseInfo(){
  const amis = amisRequire('amis/embed')
  let scriptInfo = {
    'type': 'service',
    'title': '',
    'body': [
      {
        "type": "fieldset",
        "title": "用例信息",
        "collapsable": true,
        "body": [
          {
            "type": "input-text",
            "label": "用例名",
            "name": "usecaseName",
            "value": "{{scriptBaseInfo.usecaseName}}",
            "mode": "horizontal",
            "labelAlign": "left"
          },
          {
            "type": "input-text",
            "label": "用例描述",
            "name": "usecaseDescription",
            "value": "{{scriptBaseInfo.usecaseDescription}}",
            "mode": "horizontal",
            "labelAlign": "left"
          }
        ],
        "row": 0
      },
      {
        "type": "fieldset",
        "title": "用例脚本信息",
        "collapsable": true,
        "body": [
          {
            "type": "input-text",
            "name": "scriptName",
            "mode": "horizontal",
            "value": "{{scriptBaseInfo.scriptName}}",
            "labelAlign": "left",
            "label": "脚本名"
          },
          {
            "type": "input-text",
            "label": "用例脚本描述",
            "name": "scriptDescription",
            "value": "{{scriptBaseInfo.scriptDescription}}",
            "mode": "horizontal",
            "labelAlign": "left",
          },
          {
            "type": "input-text",
            "label": "版本号",
            "name": "scriptVersion",
            "value": "{{scriptBaseInfo.scriptVersion}}",
            "validateOnChange": false,
            "mode": "horizontal",
            "labelAlign": "left"
          }
        ],
        "row": 1,
      }
    ],
    "dsType": "api",
  }
  const amisScoped = amis.embed(this.$refs.script_base_info, scriptInfo)
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