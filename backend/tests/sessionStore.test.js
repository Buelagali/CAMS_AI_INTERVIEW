const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

let sessionStore;

before(async () => {
  sessionStore = await require('../utils/sessionStore');
});

describe('sessionStore', () => {
  after(async () => {
    // cleanup any test sessions
    const { memory } = { memory: {} };
  });

  describe('createSession', () => {
    it('should create a session with id and timestamp', async () => {
      const session = await sessionStore.createSession({
        name: 'Test',
        email: 'test@example.com',
        role: 'Developer',
      });
      assert.ok(session, 'session should exist');
      assert.ok(session.id, 'should have id');
      assert.ok(session.createdAt, 'should have createdAt');
      assert.equal(session.name, 'Test');
      assert.equal(session.role, 'Developer');
    });

    it('should generate unique session IDs', async () => {
      const s1 = await sessionStore.createSession({ name: 'A' });
      const s2 = await sessionStore.createSession({ name: 'B' });
      assert.notEqual(s1.id, s2.id, 'session IDs should be unique');
    });
  });

  describe('getSession', () => {
    it('should retrieve created session', async () => {
      const created = await sessionStore.createSession({
        name: 'Retrieve Test',
        email: 'retrieve@test.com',
      });
      const retrieved = await sessionStore.getSession(created.id);
      assert.ok(retrieved, 'should retrieve session');
      assert.equal(retrieved.name, 'Retrieve Test');
      assert.equal(retrieved.email, 'retrieve@test.com');
    });

    it('should return null for non-existent session', async () => {
      const result = await sessionStore.getSession('nonexistent-id');
      assert.equal(result, null);
    });

    it('should return null for empty id', async () => {
      const result = await sessionStore.getSession(null);
      assert.equal(result, null);
      const result2 = await sessionStore.getSession('');
      assert.equal(result2, null);
    });
  });

  describe('updateSession', () => {
    it('should update session fields', async () => {
      const session = await sessionStore.createSession({ name: 'Update Test' });
      const updated = await sessionStore.updateSession(session.id, { name: 'Updated' });
      assert.ok(updated, 'should return updated session');
      assert.equal(updated.name, 'Updated');
      const retrieved = await sessionStore.getSession(session.id);
      assert.equal(retrieved.name, 'Updated');
    });

    it('should preserve unmodified fields', async () => {
      const session = await sessionStore.createSession({
        name: 'Partial Update',
        role: 'Engineer',
      });
      const updated = await sessionStore.updateSession(session.id, { name: 'Partial Modified' });
      assert.equal(updated.name, 'Partial Modified');
      assert.equal(updated.role, 'Engineer', 'role should be preserved');
    });

    it('should return null for non-existent session', async () => {
      const result = await sessionStore.updateSession('nonexistent', { name: 'x' });
      assert.equal(result, null);
    });
  });

  describe('deleteSession', () => {
    it('should delete session', async () => {
      const session = await sessionStore.createSession({ name: 'Delete Test' });
      await sessionStore.deleteSession(session.id);
      const retrieved = await sessionStore.getSession(session.id);
      assert.equal(retrieved, null, 'deleted session should not exist');
    });

    it('should not throw on deleting non-existent session', async () => {
      await sessionStore.deleteSession('nonexistent');
      assert.ok(true, 'should not throw');
    });
  });

  describe('isRedisAvailable', () => {
    it('should return boolean', () => {
      const avail = sessionStore.isRedisAvailable();
      assert.ok(typeof avail === 'boolean');
    });
  });
});
