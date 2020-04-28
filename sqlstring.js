/** "Forked" from https://www.npmjs.com/package/sqlstring

Copyright (c) 2012 Felix Geisendörfer (felix@debuggable.com) and contributors

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

class SqlString {
  constructor (engine = 'mysql') {
    this.idGlobalRegexp = /`/g
    this.qualGlobalRegexp = /\./g

    // Other non sqlite engines
    this.charsGlobalRegexp = /[\0\b\t\n\r\x1a\"\'\\]/g // eslint-disable-line
    this.charsEscapeMap = {
      '\0': '\\0',
      '\b': '\\b',
      '\t': '\\t',
      '\n': '\\n',
      '\r': '\\r',
      '\x1a': '\\Z',
      '"': '\\"',
      '\'': '\\\'',
      '\\': '\\\\'
    }

    // Other non sqlite engines
    if (engine === 'sqlite') {
      // Defaults to sqlite escape
      this.charsGlobalRegexp = /[']/g
      this.charsEscapeMap = {
        '\'': '\'\''
      }
    }
  }

  escapeId (val, forbidQualified) {
    if (Array.isArray(val)) {
      var sql = ''

      for (var i = 0; i < val.length; i++) {
        sql += (i === 0 ? '' : ', ') + this.escapeId(val[i], forbidQualified)
      }

      return sql
    } else if (forbidQualified) {
      return '`' + String(val).replace(this.idGlobalRegexp, '``') + '`'
    } else {
      return '`' + String(val).replace(this.idGlobalRegexp, '``').replace(this.qualGlobalRegexp, '`.`') + '`'
    }
  }

  escape (val, stringifyObjects, timeZone) {
    if (val === undefined || val === null) {
      return 'NULL'
    }

    switch (typeof val) {
      case 'boolean': return (val) ? 'true' : 'false'
      case 'number': return val + ''
      case 'object':
        if (val instanceof Date) {
          return this.dateToString(val, timeZone || 'local')
        } else if (Array.isArray(val)) {
          return this.arrayToList(val, timeZone)
        } else if (Buffer.isBuffer(val)) {
          return this.bufferToString(val)
        } else if (typeof val.toSqlString === 'function') {
          return String(val.toSqlString())
        } else if (stringifyObjects) {
          return this.escapeString(val.toString())
        } else {
          return this.objectToValues(val, timeZone)
        }
      default: return this.escapeString(val)
    }
  }

  arrayToList (array, timeZone) {
    var sql = ''

    for (var i = 0; i < array.length; i++) {
      var val = array[i]

      if (Array.isArray(val)) {
        sql += (i === 0 ? '' : ', ') + '(' + this.arrayToList(val, timeZone) + ')'
      } else {
        sql += (i === 0 ? '' : ', ') + this.escape(val, true, timeZone)
      }
    }

    return sql
  }

  format (sql, values, stringifyObjects, timeZone) {
    if (values == null) {
      return sql
    }

    if (!(values instanceof Array || Array.isArray(values))) {
      values = [values]
    }

    var chunkIndex = 0
    var placeholdersRegex = /\?+/g
    var result = ''
    var valuesIndex = 0
    var match

    while (valuesIndex < values.length && (match = placeholdersRegex.exec(sql))) {
      var len = match[0].length

      if (len > 2) {
        continue
      }

      var value = len === 2
        ? this.escapeId(values[valuesIndex])
        : this.escape(values[valuesIndex], stringifyObjects, timeZone)

      result += sql.slice(chunkIndex, match.index) + value
      chunkIndex = placeholdersRegex.lastIndex
      valuesIndex++
    }

    if (chunkIndex === 0) {
      // Nothing was replaced
      return sql
    }

    if (chunkIndex < sql.length) {
      return result + sql.slice(chunkIndex)
    }

    return result
  }

  dateToString (date, timeZone) {
    var dt = new Date(date)

    if (isNaN(dt.getTime())) {
      return 'NULL'
    }

    var year
    var month
    var day
    var hour
    var minute
    var second
    var millisecond

    if (timeZone === 'local') {
      year = dt.getFullYear()
      month = dt.getMonth() + 1
      day = dt.getDate()
      hour = dt.getHours()
      minute = dt.getMinutes()
      second = dt.getSeconds()
      millisecond = dt.getMilliseconds()
    } else {
      var tz = this.convertTimezone(timeZone)

      if (tz !== false && tz !== 0) {
        dt.setTime(dt.getTime() + (tz * 60000))
      }

      year = dt.getUTCFullYear()
      month = dt.getUTCMonth() + 1
      day = dt.getUTCDate()
      hour = dt.getUTCHours()
      minute = dt.getUTCMinutes()
      second = dt.getUTCSeconds()
      millisecond = dt.getUTCMilliseconds()
    }

    // YYYY-MM-DD HH:mm:ss.mmm
    var str = this.zeroPad(year, 4) + '-' + this.zeroPad(month, 2) + '-' + this.zeroPad(day, 2) + ' ' +
        this.zeroPad(hour, 2) + ':' + this.zeroPad(minute, 2) + ':' + this.zeroPad(second, 2) + '.' +
        this.zeroPad(millisecond, 3)

    return this.escapeString(str)
  }

  bufferToString (buffer) {
    return 'X' + this.escapeString(buffer.toString('hex'))
  }

  objectToValues (object, timeZone) {
    var sql = ''

    for (var key in object) {
      var val = object[key]

      if (typeof val === 'function') {
        continue
      }

      sql += (sql.length === 0 ? '' : ', ') + this.escapeId(key) + ' = ' + this.escape(val, true, timeZone)
    }

    return sql
  }

  raw (sql) {
    if (typeof sql !== 'string') {
      throw new TypeError('argument sql must be a string')
    }

    return {
      toSqlString: function toSqlString () { return sql }
    }
  }

  escapeString (val) {
    var chunkIndex = this.charsGlobalRegexp.lastIndex = 0
    var escapedVal = ''
    var match

    while ((match = this.charsGlobalRegexp.exec(val))) {
      escapedVal += val.slice(chunkIndex, match.index) + this.charsEscapeMap[match[0]]
      chunkIndex = this.charsGlobalRegexp.lastIndex
    }

    if (chunkIndex === 0) {
      // Nothing was escaped
      return "'" + val + "'"
    }

    if (chunkIndex < val.length) {
      return "'" + escapedVal + val.slice(chunkIndex) + "'"
    }

    return "'" + escapedVal + "'"
  }

  zeroPad (number, length) {
    number = number.toString()
    while (number.length < length) {
      number = '0' + number
    }

    return number
  }

  convertTimezone (tz) {
    if (tz === 'Z') {
      return 0
    }

      var m = tz.match(/([\+\-\s])(\d\d):?(\d\d)?/) // eslint-disable-line
    if (m) {
      return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) + ((m[3] ? parseInt(m[3], 10) : 0) / 60)) * 60
    }
    return false
  }
}

module.exports = (engine) => {
  return new SqlString(engine)
}
