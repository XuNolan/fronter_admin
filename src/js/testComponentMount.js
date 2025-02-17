import {createApp} from "vue";
import TestComponent from "../components/TestComponents.vue";

const websocketMount = createApp(TestComponent);
websocketMount.mount('#websocketApp')