'use strict'

const fs = require('fs'),
  _ = require('lodash')

module.exports = {
  _: _,
  options: {
    path: '/tmp',
    inMemory: false,
    dbName: 'test'
  },
  dummyData: [
    { _id: 'jack-bauer', name: 'Jack Bauer' },
    { _id: 'james-bond', name: 'James Bond' }
  ],
  timeout: 5000,
  resetDb: function (callback) {
    let me = this,
      file = me.options.path + '/' + me.options.dbName + '.nedb'
    const Datastore = require('nedb'),
      db = new Datastore({ autoload: true, filename: file })
    db.remove({}, { multi: true }, function() {
      db.insert(me.dummyData, function(err, data) {
        db.persistence.persistCachedDatabase(callback)
      })
    })
  }
}