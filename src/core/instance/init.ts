import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'
import type { Component } from 'types/component'
import type { InternalComponentOptions } from 'types/options'
import { EffectScope } from 'v3/reactivity/effectScope'

let uid = 0

export function initMixin(Vue: typeof Component) {
  // Vue 原型上添加 _init方法
  Vue.prototype._init = function (options?: Record<string, any>) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag

    // 在非生产环境下，并且 config.performance 和 mark 都为真，那么才执行里面的代码
    // 开启性能追踪
    /* istanbul ignore if */
    if (__DEV__ && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to mark this as a Vue instance without having to do instanceof
    // check
    // 标记为Vue实例，避免响应系统观测
    vm._isVue = true
    // avoid instances from being observed
    vm.__v_skip = true
    // effect scope
    vm._scope = new EffectScope(true /* detached */)
    // #13134 edge case where a child component is manually created during the
    // render of a parent component
    vm._scope.parent = undefined
    vm._scope._vm = true

    // 1. 合并选项 用户和系统的 option合并一下
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options as any)
    } else {
      // 传入三个参数，构造函数的options，初始化的options，实例本身
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor as any),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (__DEV__) {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }

    // 初始化过程
    // expose real self
    vm._self = vm
    initLifecycle(vm) // $parent,$root,$children,$refs
    initEvents(vm) // 添加监听 父组件传入的事件和回调
    initRender(vm) // 申明 $slots,$createElement()
    callHook(vm, 'beforeCreate', undefined, false /* setContext */) // 调用生命周期函数
    initInjections(vm) // resolve injections before data/props // 注入数据
    initState(vm) // 重要，数据初始化，响应式 props methods data...
    initProvide(vm) // resolve provide after data/props // 提供数据
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (__DEV__ && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    // 如果设置了 el 选项 , 自动执行 $mount
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent(
  vm: Component,
  options: InternalComponentOptions
) {
  const opts = (vm.$options = Object.create((vm.constructor as any).options))
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions!
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

// 解析构造函数的options
export function resolveConstructorOptions(Ctor: typeof Component) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions(
  Ctor: typeof Component
): Record<string, any> | null {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
