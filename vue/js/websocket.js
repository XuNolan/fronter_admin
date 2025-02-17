import {createApp} from "vue";
import WebsocketComponents from "../components/TestComponents.vue";

const websocketMount = createApp(WebsocketComponents);
websocketMount.mount('#websocketApp')