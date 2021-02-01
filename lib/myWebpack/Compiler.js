const fs = require('fs')
const path = require('path')
const { getAst, getDeps, getCode } = require('./parser.js')

class Compiler {
	constructor(options = {}) {
		// webpack配置对象
		this.options = options
		// 所有依赖容器
		this.modules = []
	}

	// 启动webpack打包
	run() {
		// 获取入口文件路径
		const filePath = this.options.entry
		// 第一次构建得到入口文件信息
		const fileInfo = this.build(filePath)
		this.modules.push(fileInfo)
		// 遍历所有的依赖
		this.modules.forEach(fileInfo => {
			// 取出当前文件的所有依赖
			const deps = fileInfo.deps
			for (const relativePath in deps) {
				// 遍历获得依赖文件的绝对路径
				const absolutePath = deps[relativePath]
				// 对依赖文件进行处理（此处递归了build）
				const fileInfo = this.build(absolutePath)
				// 将处理后的结果添加到modules中，后面的遍历就会遍历它了
				this.modules.push(fileInfo)
			}
		})
		// 根据依赖生成一个结构如下的依赖关系图对象
		/* 
			{
				'index.js': {
					code: 'xxx',
					deps: { 'add.js': '绝对路径' }
				}
			} 
		*/
		const depsGraph = this.modules.reduce((graph, module) => {
			return {
				...graph,
				[module.filePath]: {
					code: module.code,
					deps: module.deps
				}
			}
		}, {})

		this.generate(depsGraph)
	}

	// 开始构建
	build(filePath) {
		// 1.将文件解析成抽象语法树 (ast)
		const ast = getAst(filePath)
		// 2.获取ast中所有依赖
		const deps = getDeps(ast, filePath)
		// 3.将ast解析成code
		const code = getCode(ast)

		return {
			filePath,
			// 当前文件的依赖
			deps,
			// 当前文件解析后代码
			code
		}
	}

	// 生成输出资源
	generate(depsGraph) {
		/*  index.js的code:
			"use strict";\n' +
			'\n' +
	  		'var _add = _interopRequireDefault(require("./add.js"));\n' +
	  		'\n' +
	  		'var _count = _interopRequireDefault(require("./count.js"));\n' +
	  		'\n' +
	  		'function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }\n' +
	  		'\n' +
	  		'console.log((0, _add["default"])(1, 2));\n' +
	  		'console.log((0, _count["default"])(3, 1)); 
	    */
		const bundle = `
			;(function(depsGraph) {
				// 加载入口文件
				function require(module) {
					// 模块内部的require函数，也就是说index.js里的require执行时就是执行localRequire
					function localRequire(relativePath) {
						// depsGraph[module].deps[relativePath]就是要引入的模块的绝对路径
						return require(depsGraph[module].deps[relativePath])
					}
					// 定义暴露对象（将来我们模块暴露的内容）
					var exports = {}
					;(function(require, exports, code) {
						eval(code)
					})(localRequire, exports, depsGraph[module].code)
					// 作为require函数的返回值返回出去，方便后面的require函数使用
					return exports
				}
				// 加载入口文件
				require('${this.options.entry}')
			})(${JSON.stringify(depsGraph)})
		`
		// 生成输出文件的绝对路径
		const filePath = path.resolve(this.options.output.path, this.options.output.filename)
		// 写入文件
		fs.writeFileSync(filePath, bundle, 'utf-8')
	}
}
module.exports = Compiler