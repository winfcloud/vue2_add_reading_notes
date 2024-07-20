import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import {
  shouldDecodeNewlines,
  shouldDecodeNewlinesForHref
} from './util/compat'
import type { Component } from 'types/component'
import type { GlobalAPI } from 'types/global-api'

// 根据 id 获取元素的innerHTML
const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// 保存原来的$mount，扩展$mount方法
const mount = Vue.prototype.$mount
// 覆盖默认的$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 获取宿主元素
  el = el && query(el)

  // 判断挂载点是否是 body或者html
  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    __DEV__ &&
      warn(
        `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
      )
    return this
  }
  // 解析option，处理选项
  const options = this.$options

  // 判断是否存在render渲染函数
  // resolve template/el and convert to render function
  if (!options.render) {
    // 定义template
    let template = options.template
    // 如果存在 template 选项
    if (template) {
      if (typeof template === 'string') {
        // 如果是字符串
        if (template.charAt(0) === '#') {
          // 字符串第一个字符是# 作为css选择符找到对应的元素
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (__DEV__ && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // 如果是元素节点，作为innerHTML模板
        template = template.innerHTML
      } else {
        // 不符合需求，提示报错
        if (__DEV__) {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      // 如果template不存在，使用el的outerHTML 作为模板内容
      // @ts-expect-error
      template = getOuterHTML(el)
    }
    // template不为空才运行
    if (template) {
      // 统计性能
      /* istanbul ignore if */
      if (__DEV__ && config.performance && mark) {
        mark('compile')
      }

      // 模板编译得到 render 渲染函数
      const { render, staticRenderFns } = compileToFunctions(
        template,
        {
          outputSourceRange: __DEV__,
          shouldDecodeNewlines,
          shouldDecodeNewlinesForHref,
          delimiters: options.delimiters,
          comments: options.comments
        },
        this
      )
      // 赋值给组件选项
      options.render = render
      options.staticRenderFns = staticRenderFns

      // 统计性能
      /* istanbul ignore if */
      if (__DEV__ && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 执行挂载
  return mount.call(this, el, hydrating)
}

/**
 * 获取元素的outerHTML
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML(el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

// 在Vue 上添加一个全局API`Vue.compile` 其值为上面导入进来的 compileToFunctions
Vue.compile = compileToFunctions

export default Vue as GlobalAPI
