/**
 * A tiny synchronous, better-sqlite3-compatible facade built on top of sql.js
 * (SQLite compiled to WebAssembly). We use this instead of better-sqlite3 so
 * that `npm install` never needs to compile a native module - it works
 * identically on every OS/architecture with zero build tools required.
 *
 * Only the subset of the better-sqlite3 API actually used in this project is
 * implemented: db.exec(), db.pragma(), db.prepare(sql).run/get/all(...params),
 * and db.transaction(fn).
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

function normalizeParams(params) {
  // Support both db.prepare(sql).run(a, b, c) and .run([a, b, c])
  if (params.length === 1 && Array.isArray(params[0])) return params[0];
  return params;
}

class Statement {
  constructor(wrapper, sql) {
    this.wrapper = wrapper;
    this.sql = sql;
  }

  run(...params) {
    const p = normalizeParams(params);
    const stmt = this.wrapper.raw.prepare(this.sql);
    try {
      stmt.bind(p);
      stmt.step();
    } finally {
      stmt.free();
    }
    const idRows = this.wrapper.raw.exec('SELECT last_insert_rowid() AS id');
    const lastInsertRowid = idRows[0]?.values?.[0]?.[0] ?? null;
    const changes = this.wrapper.raw.getRowsModified();
    this.wrapper.markDirty();
    return { lastInsertRowid, changes };
  }

  get(...params) {
    const rows = this.all(...params);
    return rows[0];
  }

  all(...params) {
    const p = normalizeParams(params);
    const stmt = this.wrapper.raw.prepare(this.sql);
    const rows = [];
    try {
      if (p.length) stmt.bind(p);
      while (stmt.step()) rows.push(stmt.getAsObject());
    } finally {
      stmt.free();
    }
    return rows;
  }
}

class DbWrapper {
  constructor(raw, filePath) {
    this.raw = raw;
    this.filePath = filePath;
    this._dirty = false;
    this._flushTimer = null;
  }

  prepare(sql) {
    return new Statement(this, sql);
  }

  exec(sql) {
    this.raw.exec(sql);
    this.markDirty();
    this.flush(); // schema/setup statements should persist immediately
  }

  pragma() {
    // No-op: sql.js is single-connection/in-process, so WAL/foreign_key
    // pragmas from better-sqlite3 don't have an equivalent that matters here.
  }

  transaction(fn) {
    return (...args) => {
      this.raw.exec('BEGIN');
      try {
        const result = fn(...args);
        this.raw.exec('COMMIT');
        this.markDirty();
        this.flush();
        return result;
      } catch (err) {
        this.raw.exec('ROLLBACK');
        throw err;
      }
    };
  }

  markDirty() {
    this._dirty = true;
    // Flush immediately and synchronously. At this app's scale (a class
    // project, not a high-traffic service) the write cost is negligible
    // (single-digit milliseconds), and it removes any risk of losing the
    // last write if the process exits before a debounced timer fires.
    this.flush();
  }

  flush() {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    if (!this._dirty) return;
    const data = this.raw.export();
    fs.writeFileSync(this.filePath, Buffer.from(data));
    this._dirty = false;
  }
}

async function openAsync(filePath) {
  const SQL = await initSqlJs({
    // Locate the wasm binary that ships inside the sql.js package.
    locateFile: (file) => path.join(require.resolve('sql.js/dist/sql-wasm.wasm')),
  });
  let raw;
  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    raw = new SQL.Database(fileBuffer);
  } else {
    raw = new SQL.Database();
  }
  return new DbWrapper(raw, filePath);
}

module.exports = { openAsync };
