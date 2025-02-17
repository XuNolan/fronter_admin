import { createApp } from 'vue'
import router from './router'
import Test from './components/MainPage.vue'

const app = createApp(Test)

app.use(router)
app.mount('#app')
