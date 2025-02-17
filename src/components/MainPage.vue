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
          "label": "用例管理",
          "children": [
            {
              "label": "用例管理",
              "url": "/usecase",
              "rewrite": "/usecase/",
              "icon": "fa fa-cube",
              "children": [
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