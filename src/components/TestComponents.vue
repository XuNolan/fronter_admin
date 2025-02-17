<template>
  <div>
    <a>pathid={{pathdata}}</a>
  </div>
</template>

<script>
export default {
  data() {
    return {
      pathdata: null,
      path : null
    }
  },
  mounted() {
    const path = window.location.href;
    console.log(path)
    this.path = path;
    const pathParts = path.split('?');
    this.pathdata = pathParts[pathParts.length-1];  // 获取路径中的最后一部分作为 ID
  },
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