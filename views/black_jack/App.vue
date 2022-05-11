<template>
    <div class="app">
        <Home></Home>
    </div>
</template>

<script type="module">
import Home from '/black_jack_src/views/Home.vue'

export default {
  components: {
    Home
  }
}
</script>

<style scoped>
#app {
    z-index: 999;
}
</style>