const fs = require('fs')
const path = require('path')
const babelParser = require('@babel/parser')
const { transformFromAst } = require("@babel/core")
// babel6+ 用require引 export default 导出的组件，还要加个require().default
const traverse = require('@babel/traverse').default

const parser = {
	// 将文件解析成抽象语法树
	getAst(filePath) {
		// 读取文件
		const file = fs.readFileSync(filePath, 'utf-8')
		// 将其解析成ast抽象语法树
		const ast = babelParser.parse(file, {
			sourceType: 'module' // 解析文件的模块化方案为ES Module
		})
		return ast
	},
	
	// 获取依赖
	getDeps(ast, filePath) {
		// 获取入口文件的目录的路径
		const dirname = path.dirname(filePath)
		
		// 定义存储依赖的容器
		const deps = {}
		
		// 收集依赖
		traverse(ast, {
			// 内部会遍历ast中program.body，判断里面语句的类型
			// 如果type是ImportDeclaration就会触发下面的函数
			ImportDeclaration({ node }) {
				// 文件的相对路径'./add.js'
				const relativePath = node.source.value
				// 基于入口文件的绝对路径
				const absolutePath = path.resolve(dirname, relativePath)
				// 添加依赖
				deps[relativePath] = absolutePath
				/* 
					console.log(deps)
					{
					  './add.js': 'D:\\Chiam\\code\\myWebpack\\src\\add.js',
					  './count.js': 'D:\\Chiam\\code\\myWebpack\\src\\count.js'
					} 
				*/
			}
		})
		
		return deps
	},
	
	// 将解析成code
	getCode(ast) {
		// 编译代码：将代码中浏览器不能识别的语法进行编译
		const { code } = transformFromAst(ast, null, {
			presets: ['@babel/preset-env']
		})
		return code
	}
}
module.exports = parser