'use strict'

const chai = require('chai'),
  chaiAsPromised = require('chai-as-promised'),
  chaiSubset = require('chai-subset'),  
  expect = chai.expect

chai.use(chaiSubset)
chai.use(chaiAsPromised)

const Cls = require('../index'),
  lib = require('./_lib')

describe('bulkCreate', function () {
  beforeEach(function (done) {
    this.timeout(lib.timeout)
    setTimeout(function() {
      lib.resetDb(function (err, db) {
        if (err) throw err
        done()
      })      
    }, 2000)
  })

  this.timeout(lib.timeout)

  it('should return error if body isn\'t an array', function () {
    const cls = new Cls(lib.options)
    return expect(cls.bulkCreate({ name: 'Rambo' })).to.be.rejectedWith('Require array')
  })

  it('should return the correct bulk status', function() {
    const cls = new Cls(lib.options)
    let p = cls.bulkCreate(lib.bulkDocs, { withDetail: true })
    return Promise.all([
      expect(p).to.eventually.have.property('stat').that.have.property('ok').equal(2),
      expect(p).to.eventually.have.property('stat').that.have.property('fail').equal(1),
      expect(p).to.eventually.have.property('stat').that.have.property('total').equal(3),
      expect(p).to.eventually.have.property('detail').that.containSubset([{ _id: 'jack-bauer', message: 'Exists', success: false }]),
      expect(p).to.eventually.have.property('detail').that.containSubset([{ _id: 'johnny-english', success: true }])
    ])
  })

})