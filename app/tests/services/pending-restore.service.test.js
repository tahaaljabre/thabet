const fs = require('fs');
const os = require('os');
const path = require('path');

let mockUserData;
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => mockUserData)
  }
}));

const { applyPendingDatabaseRestore } = require('../../main/services/pending-restore.service');

function sqliteLikeBuffer(label) {
  return Buffer.concat([
    Buffer.from('SQLite format 3\0', 'utf8'),
    Buffer.from(label, 'utf8')
  ]);
}

describe('Pending database restore', () => {
  beforeEach(() => {
    mockUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'thabit-pending-restore-'));
  });

  afterEach(() => {
    fs.rmSync(mockUserData, { recursive: true, force: true });
  });

  it('installs the staged database before SQLite opens and removes stale WAL files', () => {
    const databasePath = path.join(mockUserData, 'database.sqlite');
    const stagedPath = path.join(mockUserData, 'pending-cloud-restore.sqlite');
    const markerPath = path.join(mockUserData, 'pending-cloud-restore.json');
    fs.writeFileSync(databasePath, sqliteLikeBuffer('old database'));
    fs.writeFileSync(`${databasePath}-wal`, Buffer.from('stale wal'));
    fs.writeFileSync(`${databasePath}-shm`, Buffer.from('stale shm'));
    fs.writeFileSync(stagedPath, sqliteLikeBuffer('restored database'));
    fs.writeFileSync(markerPath, JSON.stringify({ stagedPath }), 'utf8');

    const result = applyPendingDatabaseRestore();

    expect(result).toEqual({ applied: true });
    expect(fs.readFileSync(databasePath).equals(sqliteLikeBuffer('restored database'))).toBe(true);
    expect(fs.existsSync(`${databasePath}-wal`)).toBe(false);
    expect(fs.existsSync(`${databasePath}-shm`)).toBe(false);
    expect(fs.existsSync(stagedPath)).toBe(false);
    expect(fs.existsSync(markerPath)).toBe(false);
  });
});
