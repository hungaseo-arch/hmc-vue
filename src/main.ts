import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './index.css'

const app = createApp(App)

app.use(router)
app.mount('#app')

// 엣지가 크롤러용으로 넣은 숨김 블록(SEO). 앱이 뜨면 필요 없다.
document.getElementById('ssr-seo')?.remove()
