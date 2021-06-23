const path = require('path')
const source = require('./src')
const dist = path.resolve('./dist')
module.exports = process.env.NODE_ENV === 'production' ? dist : source
