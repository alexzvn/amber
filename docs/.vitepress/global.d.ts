declare module '@shikijs/vitepress-twoslash/client' {
  import type { DefineComponent, Plugin } from 'vue'

  const component: DefineComponent & Plugin

  export default component
}