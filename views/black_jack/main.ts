import {Card, Cards} from "./sprites/Card.mjs";


const options = {
  moduleCache: {vue: Vue},
  getFile(url: string) {
      url = /.*?\.js|.mjs|.css|.less|.vue$/.test(url) ? url : `${url}.vue`
      const type = /.*?\.js|.mjs$/.test(url) ? ".mjs" : /.*?\.vue$/.test(url) ? '.vue' : /.*?\.css$/.test(url) ? '.css' : '.vue';
      const getContentData = asBinary => fetch(url).then(res => !res.ok ? Promise.reject(url) : asBinary ? res.arrayBuffer() : res.text())
      return {getContentData: getContentData, type: type}
  },
  addStyle(textContent) {
      let styleElement = document.createElement('style');
      document.head.insertBefore(Object.assign(styleElement, {textContent}),
          document.head.getElementsByTagName('style')[0] || null);
  },
  handleModule(type, getContentData, path, options) {
      switch (type) {
          case '.css':
              return options.addStyle(getContentData(false));
          case '.less':
              console.error('.......')
      }
  },
  log(type, ...args) {
      console.log(type, ...args);
  }
};

const { loadModule } = window['vue3-sfc-loader'];

const app = Vue.createApp({
    components: {
      'app': Vue.defineAsyncComponent( () => loadModule('/black_jack_src/App.vue', options) )
    }
  });
app.mount('#app');

let a: Cards = new Cards([])
let c: Cards = new Cards([])
c.makeFullDeck()
c.shuffle()
c.sortCards()
c.giveTo(a, 1)
console.log(c)
console.log(a)

