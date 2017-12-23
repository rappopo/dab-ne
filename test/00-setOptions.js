'use strict'

const chai = require('chai'),
  expect = chai.expect,
  chaiSubset = require('chai-subset')

chai.use(chaiSubset)

const Cls = require('../index'),
  lib = require('./_lib')

describe('setOptions', function () {
  it('should return the default options', function () {
    const cls = new Cls()
    expect(cls.options).to.include({
      path: '/tmp',
      dbName: 'test',
      inMemory: false
    })
  })

  it('should return options with custom path', function () {
    const cls = new Cls({ 
      path: '/home/username'
    })
    expect(cls.options).to.include({
      path: '/home/username'
    })
  })

  it('should return options with custom dbName', function () {
    const cls = new Cls({ 
      dbName: 'mydb'
    })
    expect(cls.options).to.include({
      dbName: 'mydb'
    })
  })

  it('should return options with custom inMemory', function () {
    const cls = new Cls({ 
      inMemory: false
    })
    expect(cls.options).to.include({
      inMemory: false
    })
  })

})


