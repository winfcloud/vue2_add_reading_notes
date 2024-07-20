import { parse } from 'compiler/parser/index'
import { generate } from './codegen'
import { optimize } from './optimizer'
import { createCompilerCreator } from 'compiler/create-compiler'
import { CompiledResult, CompilerOptions } from 'types/compiler'

export const createCompiler = createCompilerCreator(function baseCompile(
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 1.解析：模板转换为对象AST
  const ast = parse(template.trim(), options)

  // 2.优化：标记静态节点，diff时可以直接跳过
  optimize(ast, options)

  // 3.代码生成：转换AST为代码字符串 new Function(code)
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
