'use strict'

const Datastore = require('nedb'),
  path = require('path'),
  async = require('async'),
  Dab = require('@rappopo/dab')

class DabNe extends Dab {
  constructor (options) {
    super(options)
  }

  setOptions (options) {
    super.setOptions(this._.merge(this.options, {
      idSrc: '_id',
      idDest: options.idDest || options.idSrc || '_id',
      path: options.path || '/tmp',
      dbName: options.dbName || 'test',
      inMemory: false,
    }))
  }

  setClient (params) {
    if (this.client) return
    let opt = { 
      autoload: true
    }
    if (!this.options.inMemory)
      opt.filename = path.join(this.options.path, this.options.dbName + '.nedb')
    this.client = new Datastore(opt)
  }

  find (params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    let limit = params.limit || this.options.limit,
      skip = ((params.page || 1) - 1) * limit,
      sort = params.sort,
      query = params.query || {}
    return new Promise((resolve, reject) => {
      this.client.find(query).sort(sort).skip(skip).limit(limit).exec((err, docs) => {
        if (err)
          return reject(err)
        this.client.count(query).exec((err, count) => {
          if (err)
            return reject(err)
          let data = { success: true, data: [], total: count }
          docs.forEach((d, i) => {
            data.data.push(this.convertDoc(d))
          })
          resolve(data)
        })
      })
    })
  }

  _findOne(id, params, callback) {
    let key = {}
    key[this.options.idSrc] = id
    this.client.findOne(key, (err, result) => {
      if (err) {
        if (this._.isEmpty(result))
          err = new Error('Not found')
        return callback(null, {
          success: false,
          err: err
        })
      }
      let data = {}
      if (!this._.isEmpty(result)) {
        data.data = result
        data.success = true
      } else {
        data.err = new Error('Not found')
        data.success = false
      }
      callback(data)        
    })

  }

  findOne (id, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      this._findOne(id, params, result => {
        if (!result.success)
          return reject(result.err)
        result.data = this.convertDoc(result.data)
        resolve(result)
      })
    })
  }

  create (body, params) {
    [params, body] = this.sanitize(params, body)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      if (body[this.options.idDest] && this.options.idDest !== this.options.idSrc) {
        body[this.options.idSrc] = body[this.options.idDest]
        delete body[this.options.idDest]
      }
      this.client.insert(body, (err, result) => {
        if (err) {
          if (err.key === body[this.options.idSrc] && err.errorType === 'uniqueViolated')
            err = new Error('Exists')
          return reject(err)
        }
        let data = {
          success: true,
          data: this.convertDoc(result)
        }
        resolve(data)
      })
    })
  }

  update (id, body, params) {
    [params, body] = this.sanitize(params, body)
    this.setClient(params)
    body = this._.omit(body, [this.options.idDest || this.options.idSrc])
    return new Promise((resolve, reject) => {
      this._findOne(id, params, result => {
        if (!result.success)
          return reject(result.err)
        let source = result.data,
          key = {}
        key[this.options.idSrc] = id
        if (!params.fullReplace)
          body = { $set: body }
        this.client.update(key, body, { returnUpdatedDocs: true }, (err, numAffected, affectedDocs, upsert) => {
          if (err)
            return reject(err)
          let data = {
            success: true,
            data: this.convertDoc(affectedDocs)
          }
          if (params.withSource)
            data.source = this.convertDoc(source)
          resolve(data)
        })
      })
    })
  }

  remove (id, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      this._findOne(id, params, result => {
        if (!result.success)
          return reject(result.err)
        let source = result.data,
          key = {}
        key[this.options.idSrc] = id
        this.client.remove(key, {}, (err, numRemoved) => {
          if (err) {
            reject(err)
            return callback(err)
          }
          let data = params.withSource ? { success: true, source: this.convertDoc(source) } : { success: true }
          resolve(data)
        })
      })
    })
  }

  bulkCreate (body, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      if (!this._.isArray(body))
        return reject(new Error('Require array'))

      let proj = {}
      this._.each(body, (b, i) => {
        if (!b[this.options.idSrc])
          b[this.options.idSrc] = this.uuid()
        body[i] = b
        this._.forOwn(b, (v, k) => {
          proj[k] = 0
        })
      })
      proj._id = 1
      const keys = this._(body).map(this.options.idSrc).value()

      this.client.find({
        _id: {
          $in: keys
        }
      }, proj, (err, docs) => {
        if (err)
          return reject(err)
        let info = this._.map(docs, '_id'),
          newBody = this._.clone(body)
        this._.pullAllWith(newBody, info, (i,x) => {
          return i._id === x
        })
        this.client.insert(newBody, (err, result) => {
          if (err)
            return reject(err)
          let ok = 0, status = []
          this._.each(body, (r, i) => {
            let stat = { success: info.indexOf(r._id) === -1 ? true : false }
            stat[this.options.idDest] = r._id
            if (!stat.success)
              stat.message = 'Exists'
            else
              ok++
            status.push(stat)
          })
          let data = {
            success: true,
            stat: {
              ok: ok,
              fail: body.length - ok,
              total: body.length
            }
          }
          if (params.withDetail)
            data.detail = status
          resolve(data)
        })    
      })
    })
  }

  bulkUpdate (body, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      if (!this._.isArray(body))
        return reject(new Error('Require array'))

      let proj = {}
      this._.each(body, (b, i) => {
        if (!b[this.options.idSrc])
          b[this.options.idSrc] = this.uuid()
        body[i] = b
        this._.forOwn(b, (v, k) => {
          proj[k] = 0
        })
      })
      proj._id = 1
      const keys = this._(body).map(this.options.idSrc).value()

      this.client.find({
        _id: {
          $in: keys
        }
      }, proj, (err, docs) => {
        if (err)
          return reject(err)
        let info = this._.map(docs, '_id'),
          newBody = this._.clone(body)
        this._.pullAllWith(newBody, info, (i,x) => {
          return i._id !== x
        })

        async.mapSeries(newBody, (b, cb) => {
          this.client.update({ 
            _id: b._id 
          }, this._.omit(newBody, ['_id']), {}, err => {
            cb(null, err ? { _id: b._id, message: err.message } : null)
          })
        }, (err, result) => {
          let ok = 0, status = []
          this._.each(body, (r, i) => {
            let stat = { success: info.indexOf(r._id) > -1 ? true : false }
            if (stat.success) {
              let rec = this._.find(result, { _id: r.id })
              if (rec) {
                stat.success = false
                stat.message = rec.message
              }
            }
            stat[this.options.idDest] = r._id
            if (!stat.success && !stat.message)
              stat.message = 'Not found'
            else
              ok++
            status.push(stat)
          })
          let data = {
            success: true,
            stat: {
              ok: ok,
              fail: body.length - ok,
              total: body.length
            }
          }
          if (params.withDetail)
            data.detail = status
          resolve(data)
        })
      })
    })
  }

  bulkRemove (body, params) {
    [params] = this.sanitize(params)
    this.setClient(params)
    return new Promise((resolve, reject) => {
      if (!this._.isArray(body))
        return reject(new Error('Require array'))
      this._.each(body, (b, i) => {
        body[i] = b || this.uuid()
      })
      this.client.find({
        _id: {
          $in: body
        }
      }, (err, docs) => {
        if (err)
          return reject(err)
        let info = this._.map(docs, '_id'),
          newBody = this._.clone(body)
        this._.pullAllWith(newBody, info, (i,x) => {
          return i !== x
        })

        this.client.remove({
          _id: {
            $in: body
          }
        }, { multi: true }, err => {
          if (err)
            return reject(err)
          let ok = 0, status = []
          this._.each(body, (r, i) => {
            let stat = { success: info.indexOf(r) > -1 ? true : false }
            stat[this.options.idDest] = r
            if (!stat.success)
              stat.message = 'Not found'
            else
              ok++
            status.push(stat)
          })
          let data = {
            success: true,
            stat: {
              ok: ok,
              fail: body.length - ok,
              total: body.length
            }
          }
          if (params.withDetail)
            data.detail = status
          resolve(data)
        })
      })
    })
  }

}


module.exports = DabNe