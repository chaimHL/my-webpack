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
				console.log(this.modules)
			}
		})
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
}
module.exports = Compiler