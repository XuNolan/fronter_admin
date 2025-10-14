<template>
  <div class="test-container">
    <!-- 基本信息区域 -->
    <div class="info-section">
      <div class="info-card usecase-info">
        <h3>用例信息</h3>
        <div class="info-row">
          <label>用例名称</label>
          <div class="info-content">{{scriptBaseInfo?.usecaseName || '无'}}</div>
        </div>
        <div class="info-row">
          <label>用例描述</label>
          <div class="info-content">{{scriptBaseInfo?.usecaseDescription || '无'}}</div>
        </div>
      </div>
      
      <div class="info-card script-info">
        <h3>脚本信息</h3>
        <div class="info-row">
          <label>脚本名称</label>
          <div class="info-content">{{scriptBaseInfo?.scriptName || '无'}}</div>
        </div>
        <div class="info-row">
          <label>脚本描述</label>
          <div class="info-content">{{scriptBaseInfo?.scriptDescription || '无'}}</div>
        </div>
        <div class="info-row">
          <label>版本号</label>
          <div class="info-content">{{scriptBaseInfo?.version || '无'}}</div>
        </div>
      </div>
      
      <div class="info-card script-content">
        <h3>原始脚本内容</h3>
        <pre><code>{{scriptBaseInfo?.scriptData || '无'}}</code></pre>
      </div>
    </div>

    <!-- 执行区域 -->
    <div class="execution-section">
      <h3>执行进度</h3>
      <div v-for="scenario in scenarioInfos" :key="scenario.index" class="scenario-block">
        <div class="scenario-header">
          <h4>{{scenario.scenarioName}}</h4>
        </div>
        <div class="steps-container">
          <div v-for="(step, stepIndex) in scenario.stepInfos" 
               :key="stepIndex" 
               class="step-block"
               :class="getStepStatusClass(scenario.index, stepIndex)">
            <div class="step-header">
              <span class="step-status-icon">
                {{ getStepStatusIcon(scenario.index, stepIndex) }}
              </span>
              <span class="step-content">{{ step.stepString }}</span>
            </div>
            <div class="step-details" v-if="hasStepDetails(scenario.index, stepIndex)">
              <div class="step-timing">
                <span>开始: {{ formatTime(getStepStartTime(scenario.index, stepIndex)) }}</span>
                <span>结束: {{ formatTime(getStepEndTime(scenario.index, stepIndex)) }}</span>
                <span>耗时: {{ formatDuration(getStepDuration(scenario.index, stepIndex)) }}</span>
              </div>
              <pre v-if="hasStepError(scenario.index, stepIndex)" class="step-error"><code>{{ getStepError(scenario.index, stepIndex) }}</code></pre>
            </div>
          </div>
        </div>
      </div>
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

let scriptIdFromUrl;
let needRecordedFromUrl;

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
    needRecordedFromUrl = getNeedRecorded();
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
    const scenarioInfos = reactive([])
    const executeResults = reactive(new Map())

    return {
      scriptBaseInfo,

      scenarioInfos,
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
          "needRecorded": getNeedRecorded()
        }
      };
      webSocket.send(JSON.stringify(startFeatureRequest));
    };
    webSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if(message && message.msgType==="karateFeatureInfos"){
        // console.log(message.content);//json content；
        this.handleKarateFeatureInfos(JSON.parse(message.content)['scenarioInfos']);
      }else if(message && message.msgType==="executeInfos"){
        // console.log(JSON.parse(message.content));
        this.handleExecuteInfos(JSON.parse(message.content));
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
      for(let i = 0;i<content.length; i++){
        console.log(content[i]);
        this.scenarioInfos.push(content[i]);
        for(let j = 0; j < content[i]['stepInfos'].length; j++){
          let stepIndexString = i+'-'+content[i]['stepInfos'][j]['index'];
          this.executeResults.set(stepIndexString, "");
        }
      }
    },
    handleExecuteInfos(content) {
      const {scenarioIndex, stepIndex, status, durationNanos, startTime, endTime, error, aborted} = content;
      // 更新该步骤的执行状态
      console.log(content);
      this.executeResults.set(`${scenarioIndex}-${stepIndex}`, content);
      // 自动滚动到底部
      this.$nextTick(() => {
        const container = document.querySelector('.test-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    },
    getStepStatusClass(scenarioIndex, stepIndex) {
      const result = this.executeResults.get(`${scenarioIndex}-${stepIndex}`);
      if (!result || result === "") return 'pending';
      if (result.error) return 'error';
      if (result.status === 'passed') return 'success';
      if (result.endTime) return 'success';  // 有结束时间说明已完成
      return 'running';
    },
    
    getStepStatusIcon(scenarioIndex, stepIndex) {
      const result = this.executeResults.get(`${scenarioIndex}-${stepIndex}`);
      if (!result || result === "") return '○'; // 待执行
      if (result.error) return '✕'; // 错误
      if (result.status === 'passed' || result.endTime) return '✓'; // 成功
      return '▶'; // 执行中
    },
    
    hasStepDetails(scenarioIndex, stepIndex) {
      const result = this.executeResults.get(`${scenarioIndex}-${stepIndex}`);
      return result && (result.startTime || result.error);
    },
    
    getStepStartTime(scenarioIndex, stepIndex) {
      const result = this.executeResults.get(`${scenarioIndex}-${stepIndex}`);
      return result?.startTime;
    },
    
    getStepEndTime(scenarioIndex, stepIndex) {
      const result = this.executeResults.get(`${scenarioIndex}-${stepIndex}`);
      return result?.endTime;
    },
    
    getStepDuration(scenarioIndex, stepIndex) {
      const result = this.executeResults.get(`${scenarioIndex}-${stepIndex}`);
      return result?.durationNanos;
    },
    
    hasStepError(scenarioIndex, stepIndex) {
      const result = this.executeResults.get(`${scenarioIndex}-${stepIndex}`);
      return result?.error;
    },
    
    getStepError(scenarioIndex, stepIndex) {
      const result = this.executeResults.get(`${scenarioIndex}-${stepIndex}`);
      return result?.error;
    },
    
    formatTime(timestamp) {
      if (!timestamp) return 'N/A';
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      });
    },
    
    formatDuration(nanos) {
      if (!nanos) return 'N/A';
      const ms = nanos / 1000000;
      if (ms < 1000) return `${ms.toFixed(0)}ms`;
      const seconds = ms / 1000;
      if (seconds < 60) return `${seconds.toFixed(1)}s`;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    },
  }

}


function getScriptId(){
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('scriptId');
  return id;
}

function getNeedRecorded(){
  const urlParams = new URLSearchParams(window.location.search);
  const needRecorded = urlParams.get('needRecorded');
  return needRecorded === 'true';
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
.test-container {
  padding: 15px;
  height: 100%;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.info-section {
  margin-bottom: 20px;
}

.info-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.info-card h3 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
}

.info-row {
  margin-bottom: 6px;
  display: flex;
  align-items: flex-start;
}

.info-row label {
  color: #666;
  font-size: 13px;
  width: 70px;
  flex-shrink: 0;
  padding-top: 8px;
}

.info-content {
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.4;
  color: #333;
}

.script-content pre {
  margin: 0;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  overflow-x: auto;
}

.script-content code {
  font-family: Monaco, Consolas, "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.execution-section {
  background: #fff;
  border-radius: 6px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.scenario-block {
  margin-bottom: 20px;
}

.scenario-header {
  margin-bottom: 10px;
}

.scenario-header h4 {
  margin: 0;
  color: #333;
  font-size: 15px;
  font-weight: 600;
}

.step-block {
  margin-bottom: 8px;
  padding: 10px;
  border-radius: 4px;
  background: #f8f9fa;
}

.step-block.pending {
  border-left: 3px solid #6c757d;
}

.step-block.running {
  border-left: 3px solid #007bff;
  background: #f0f7ff;
}

.step-block.success {
  border-left: 3px solid #28a745;
}

.step-block.error {
  border-left: 3px solid #dc3545;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-status-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.step-content {
  font-family: Monaco, Consolas, "Courier New", monospace;
  font-size: 13px;
}

.step-details {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e9ecef;
}

.step-timing {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #666;
}

.step-error {
  margin: 10px 0 0 0;
  padding: 10px;
  background: #fff5f5;
  border-radius: 4px;
  color: #dc3545;
  font-size: 12px;
  overflow-x: auto;
}

.step-error code {
  font-family: Monaco, Consolas, "Courier New", monospace;
  white-space: pre-wrap;
}
</style>