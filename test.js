const isFunction = require('lodash/isFunction')
const Handlebars = require('handlebars')
const instance = Handlebars.create()

instance.registerHelper('test', function (a, b) {
  console.log('@@a@@', a)
  console.log('@@b@@', b)

  if (isFunction(a.fn)) { a = a.fn(this) }
  return a
})

const compiled = instance.compile(
  // '{{test thing}}'
  '{{#each thing}}{{test this}} {{/each}}'
)({
  thing: {
    one: 1,
    two: 2
  }
})

console.log('@@compiled@@', compiled)
