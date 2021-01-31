const myWebpack = require('../lib/myWebpack/index.js')
const config = require('../config/myWebpack.config.js')

const compiler = myWebpack(config)
// 开始打包
compiler.run()