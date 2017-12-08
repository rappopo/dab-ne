'use strict'

const fs = require('fs'),
  _ = require('lodash')

module.exports = {
  _: _,
  options: {
    path: '/tmp',
    inMemory: true,
    dbName: 'test'
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
    let me = this,
      file = me.options.path + '/' + me.options.dbName + '.nedb'
    const Datastore = require('nedb'),
      db = new Datastore({ filename: file })
    db.loadDatabase(function(err) {
      db.remove({}, { multi: true }, function(err) {
        db.insert(me.dummyData, function(err, data) {
          db.persistence.persistCachedDatabase(callback)
        })
      })        
    })
  }
}