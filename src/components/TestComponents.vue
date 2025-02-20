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
      <div>
        <label for="version">原始脚本信息</label>
        <textarea id="version">{{scriptBaseInfo != null ? scriptBaseInfo['scriptData'] : '无'}}</textarea>
      </div>
    </fieldset>
  </div>

<!--  <div class="container">-->
<!--    <div class="left-panel">-->
<!--      <h3>Scenario Steps</h3>-->
<!--      <div v-for="(scenario, scenarioIndex) in scenarioInfos" :key="scenarioIndex" class="scenario">-->
<!--        <h3>{{ scenario['scenarioName'] }}</h3>-->
<!--        <ul>-->
<!--          <li v-for="(step, stepIndex) in scenario['stepInfos']" :key="stepIndex">-->
<!--            <strong>{{ step['stepString'] }}</strong>-->
<!--&lt;!&ndash;            <span> - </span>&ndash;&gt;-->
<!--&lt;!&ndash;            <span :class="stepStatusClass(scenarioIndex, stepIndex)">&ndash;&gt;-->
<!--&lt;!&ndash;              {{ getStepStatus(scenarioIndex, stepIndex) }}&ndash;&gt;-->
<!--&lt;!&ndash;            </span>&ndash;&gt;-->
<!--          </li>-->
<!--        </ul>-->
<!--      </div>-->
<!--    </div>-->
  <div>
    <div v-for="scenario in scenarioInfos" :key="scenarioIndex">
      <h3>{{scenario.scenarioName}}</h3>
      <ul>
        <li v-for="(step, stepIndex) in scenario.stepInfos" :key="stepIndex">
          <strong>{{ step.stepString }}</strong>
              <span> - </span>
              <span :class="stepStatusClass(scenarioIndex, stepIndex)">
                {{ getStepStatus(scenarioIndex, stepIndex) }}
              </span>
        </li>
    </ul>
    </div>
  </div>


<!--    <div class="right-panel">-->
<!--      <h3>Execution Status</h3>-->
<!--      <div v-if="currentExecution">-->
<!--        <p><strong>Status:</strong> {{ currentExecution.status }}</p>-->
<!--        <p><strong>Duration:</strong> {{ currentExecution.durationNanos }} ns</p>-->
<!--        <p><strong>Start Time:</strong> {{ formatTime(currentExecution.startTime) }}</p>-->
<!--        <p><strong>End Time:</strong> {{ formatTime(currentExecution.endTime) }}</p>-->
<!--        <p v-if="currentExecution.error"><strong>Error:</strong> {{ currentExecution.error }}</p>-->
<!--        <p v-if="currentExecution.aborted"><strong>Aborted:</strong> Yes</p>-->
<!--      </div>-->
<!--      <div v-else>-->
<!--        <p>Select a step to view execution details.</p>-->
<!--      </div>-->
<!--    </div>-->

</template>

<script>

//逻辑上，除去第一次请求完整的Script data之后， socket建立之后：
//删除了心跳；
//发起ProcessScriptStart；
//在FeatureRun回调中，服务端主动推送一次KarateFeatureInfo。携带karate切分的Scenarioid与信息。step的id与信息；
//在log中，携带此次stepResult的scenarioId和stepid辅助定位。

import axios from 'axios';
// import {initWebSocket, sendMessage, webSocket} from "../js/websocket.js";
import {reactive} from "vue";

let scriptLogData = [];
let scenarioBaseInfo = [];
let executeBaseResults = {};
let scriptIdFromUrl;

let webSocket;

export default {
  setup(){
    const scriptBaseInfo = reactive({
      usecaseName: '',
      usecaseDescription: '',
      scriptName: '',
      scriptDescription: '',
      version: '',
      scriptData: '',
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
              scriptBaseInfo.scriptData=temp.data;
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
    const scriptLog = reactive(scriptLogData);
    const scenarioInfos = reactive([])
    const executeResults = reactive(executeBaseResults)
    return {
      scriptLog,
      scriptBaseInfo,

      scenarioInfos,
      scenarioBaseInfo,
      executeResults,
      currentExecution: null,
    }
  },
  mounted() {
    if ("WebSocket" in window) {
      webSocket = new WebSocket("ws://127.0.0.1:8080/websocket");//创建socket对象
    } else {
      console.log(JSON.stringify({message: '该浏览器不支持websocket!', type: 'warning'}));
      throw new Error("websocket unsupported");
    }
    //基于websocket提示对端开始执行脚本
    webSocket.onopen = function(){
      console.log('WebSocket connection opened')
      let startFeatureRequest = {
        msgType:"script_start",
        content:{
          "scriptId": getScriptId(),
        }
      };
      webSocket.send(JSON.stringify(startFeatureRequest));
    };
    webSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if(message && message.msgType==="karateFeatureInfos"){
        console.log(message.content);//json content；
        this.handleKarateFeatureInfos(JSON.parse(message.content)['scenarioInfos']);
      }else if(message && message.msgType==="executeInfos"){
        console.log(message.content);
        this.handleExecuteInfos(message.content);
      }
    }
    webSocket.onerror = (error) => {
      console.error('WebSocket error: ', error);
    };
    webSocket.onclose = () => {
      console.log('WebSocket connection closed');
    };

  },
  methods:{
    handleKarateFeatureInfos(content){
      for(let i = 0; i<content.length; i++){
        this.scenarioInfos.push(content[i]);
      }
    },
    handleExecuteInfos(content) {
      // const {scenarioIndex, stepIndex, status, durationNanos, startTime, endTime, error, aborted} = content;

      // 更新该步骤的执行状态
      // this.scenarioBaseInfo[`${scenarioIndex}-${stepIndex}`] = {
      //   status,
      //   durationNanos,
      //   startTime,
      //   endTime,
      //   error,
      //   aborted,
      // }
    },
    getStepStatus(scenarioIndex, stepIndex) {
      const status = this.executeResults[`${scenarioIndex}-${stepIndex}`]?.status;
      return status || 'Not Started';
    },
    stepStatusClass(scenarioIndex, stepIndex) {
      const status = this.executeResults[`${scenarioIndex}-${stepIndex}`]?.status;
      switch (status) {
        case 'success':
          return 'status-success';
        case 'failure':
          return 'status-failure';
        case 'in-progress':
          return 'status-in-progress';
        default:
          return 'status-not-started';
      }
    },
    // 设置当前选中的步骤，右侧面板会显示该步骤的执行信息
    selectStep(scenarioIndex, stepIndex) {
      this.currentExecution = this.executeResults[`${scenarioIndex}-${stepIndex}`];
    },
    // 格式化时间戳
    formatTime(timestamp) {
      if (!timestamp) return 'N/A';
      const date = new Date(timestamp);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    },
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

async function fetchScriptBaseInfo(){
  let res;
  await axios.get(`http://127.0.0.1:8080/script/testInfo?scriptId=${scriptIdFromUrl}`).then(
      r =>{ res = r }
  );
  return res.data;
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