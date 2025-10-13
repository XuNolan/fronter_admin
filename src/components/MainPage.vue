<template>
  <div ref="box">
    基本信息
  </div>
</template>
<script>
export default {
  mounted() {
    const amis = amisRequire('amis/embed')
    let amisJSON = {
      "type": 'app',
      "pages": [
        {
          "label": "当前用例查看",
          "url": "/",
          "redirect": "/usecase/list"
        },
        {
          "children": [
            {
              "label": "前端自动化测试",
              "url": "/usecase",
              "rewrite": "/usecase/",
              "icon": "fa fa-cube",
              "children": [
                {
                  "label": "录制配置",
                  "url": "/record/config",
                  "icon": "fa fa-video-camera",
                  "schemaApi": "get:/pages/record-config.json"
                },
                {
                  "label": "用例列表",
                  "url":"/usecase/list",
                  "icon": "fa fa-list",
                  "schemaApi": "get:/pages/usecase-list.json"
                },
                {
                  "label": "新增用例",
                  "url": "/usecase/new",
                  "icon": "fa fa-plus",
                  "schemaApi": "get:/pages/usecase-new.json"
                },
                {
                  "label": "用例详情",
                  "url": "/usecase/query/:id",
                  "schemaApi": "get:/pages/usecase-info.json"
                },
                {
                  "label": "执行组列表",
                  "url": "/execute-group/list",
                  "icon": "fa fa-list",
                  "schemaApi": "get:/pages/execute-group-list.json"
                },
                {
                  "label": "新增执行组",
                  "url": "/execute-group/new",
                  "icon": "fa fa-plus",
                  "schemaApi": "get:/pages/execute-group-new.json"
                },
                {
                  "label": "执行组详情",
                  "url": "/execute-group/detail/:id",
                  "schemaApi": "get:/pages/execute-group-detail.json"
                }
              ]
            }
          ]
        },
        {
          "children": [
            {
              "label": "压力测试",
              "url": "/pressure",
              "icon": "fa fa-tasks",
              "children": [
                {
                  "label": "新建压测任务",
                  "url": "/pressure/new",
                  "schema": {
                    "type": "page",
                    "body": {
                      "type": "iframe",
                      "src": "/pages/config_pressure.html",
                      "height": "100vh"
                    }
                  }
                },
                {
                  "label": "任务历史报告",
                  "url": "/pressure/history",
                  "icon": "fa fa-tasks",
                  "schemaApi": "get:/pages/test2.json"
                },
                {
                    "label": "压测任务详情",
                    "type": "page",
                    "body": {
                      "type": "iframe",
                      "src": "/pages/pressure_info.html",
                      "height": "100vh"
                    }
                }
              ]
            }
            
          ]
        }
      ]
    }
    const amisScoped = amis.embed(this.$refs.box, amisJSON)
  }
}
// export default {
//   mounted() {
//
//   }
// }
</script>