'use strict'

const fs = require('fs'),
  _ = require('lodash'),
  async = require('async')

module.exports = {
  _: _,
  options: {
    path: '/tmp',
    inMemory: false,
    dbName: 'test'
  },
  options1: {
    path: '/tmp',
    inMemory: false,
    dbName: 'test1'
  },
  dummyData: [
    { _id: 'jack-bauer', name: 'Jack Bauer' },
    { _id: 'james-bond', name: 'James Bond' }
  ],
  bulkDocs: [
    { _id: 'jack-bauer', name: 'Jack Bauer' },
    { _id: 'johnny-english', name: 'Johnny English' },
    { name: 'Jane Boo' }
  ],
  timeout: 5000,
  resetDb: function (callback) {
    let me = this
    async.mapSeries(['options', 'options1'], function(o, callb) {
      let file = me[o].path + '/' + me[o].dbName + '.nedb'
      let Datastore = require('nedb'),
        db = new Datastore({ filename: file })
      db.loadDatabase(function(err) {
        db.remove({}, { multi: true }, function(err) {
          db.insert(me.dummyData, function(err, data) {
            db.persistence.persistCachedDatabase(callb)              
          })
        })        
      })
    }, callback)
  }
}