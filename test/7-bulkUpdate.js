'use strict'

const chai = require('chai'),
  chaiAsPromised = require('chai-as-promised'),
  chaiSubset = require('chai-subset'),  
  expect = chai.expect

chai.use(chaiSubset)
chai.use(chaiAsPromised)

const Cls = require('../index'),
  lib = require('./_lib')

describe('bulkUpdate', function () {
  beforeEach(function (done) {
    this.timeout(lib.timeout)
    setTimeout(function() {
      lib.resetDb(function (err, db) {
        if (err) throw err
        done()
      })      
    }, 1000)
  })

  it('should return error if body isn\'t an array', function () {
    const cls = new Cls(lib.options)
    return expect(cls.bulkCreate({ name: 'Rambo' })).to.be.rejectedWith('Require array')
  })

  it('should return the correct bulk status', function() {
    const cls = new Cls(lib.options)
    let docs = lib._.cloneDeep(lib.bulkDocs)
    docs[0].name = 'Jackie Bauer'
    let p = cls.bulkUpdate(docs)
    return Promise.all([
      expect(p).to.eventually.have.property('stat').that.have.property('ok').equal(1),
      expect(p).to.eventually.have.property('stat').that.have.property('fail').equal(2),
      expect(p).to.eventually.have.property('stat').that.have.property('total').equal(3),
      expect(p).to.eventually.have.property('data').that.containSubset([{ _id: 'jack-bauer', success: true }]),
      expect(p).to.eventually.have.property('data').that.containSubset([{ _id: 'johnny-english', message: 'Not found' }])
    ])
  })

})