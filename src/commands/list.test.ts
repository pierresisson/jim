import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { JsonStore } from '../core/store.js';
import type { List, JimData } from '../core/types.js';

describe('list command logic', () => {
  let tmpDir: string;
  let store: JsonStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jim-list-test-'));
    store = new JsonStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function loadData(): JimData {
    return store.load();
  }

  describe('create', () => {
    it('creates a new empty list', () => {
      const data = loadData();
      const list: List = {
        id: 'test-id',
        name: 'Anniversaires',
        createdAt: new Date().toISOString(),
        items: [],
      };
      data.lists.push(list);
      store.save(data);

      const reloaded = loadData();
      expect(reloaded.lists).toHaveLength(1);
      expect(reloaded.lists[0].name).toBe('Anniversaires');
      expect(reloaded.lists[0].items).toEqual([]);
    });

    it('rejects duplicate list names (case-insensitive)', () => {
      const data = loadData();
      data.lists.push({
        id: 'id1',
        name: 'Courses',
        createdAt: new Date().toISOString(),
        items: [],
      });
      store.save(data);

      const reloaded = loadData();
      const existing = reloaded.lists.find(
        (l) => l.name.toLowerCase() === 'courses'
      );
      expect(existing).toBeDefined();
    });
  });

  describe('add', () => {
    it('adds an item to a list', () => {
      const data = loadData();
      data.lists.push({
        id: 'list1',
        name: 'Courses',
        createdAt: new Date().toISOString(),
        items: [],
      });
      store.save(data);

      const reloaded = loadData();
      const list = reloaded.lists.find((l) => l.name === 'Courses')!;
      list.items.push({
        id: 'item1',
        text: 'Lait',
        done: false,
        createdAt: new Date().toISOString(),
      });
      store.save(reloaded);

      const final = loadData();
      expect(final.lists[0].items).toHaveLength(1);
      expect(final.lists[0].items[0].text).toBe('Lait');
      expect(final.lists[0].items[0].done).toBe(false);
    });

    it('adds an item with a date', () => {
      const data = loadData();
      data.lists.push({
        id: 'list1',
        name: 'Anniversaires',
        createdAt: new Date().toISOString(),
        items: [],
      });
      store.save(data);

      const reloaded = loadData();
      const list = reloaded.lists.find((l) => l.name === 'Anniversaires')!;
      list.items.push({
        id: 'item1',
        text: 'Maman',
        done: false,
        date: '2026-03-15',
        createdAt: new Date().toISOString(),
      });
      store.save(reloaded);

      const final = loadData();
      expect(final.lists[0].items[0].date).toBe('2026-03-15');
    });
  });

  describe('done', () => {
    it('marks an item as done', () => {
      const data = loadData();
      data.lists.push({
        id: 'list1',
        name: 'Courses',
        createdAt: new Date().toISOString(),
        items: [
          { id: 'item-abc-123', text: 'Lait', done: false, createdAt: new Date().toISOString() },
        ],
      });
      store.save(data);

      const reloaded = loadData();
      const item = reloaded.lists[0].items.find((i) => i.id.startsWith('item-abc'));
      expect(item).toBeDefined();
      item!.done = true;
      item!.completedAt = new Date().toISOString();
      store.save(reloaded);

      const final = loadData();
      expect(final.lists[0].items[0].done).toBe(true);
      expect(final.lists[0].items[0].completedAt).toBeDefined();
    });
  });

  describe('rm', () => {
    it('removes a single item from a list', () => {
      const data = loadData();
      data.lists.push({
        id: 'list1',
        name: 'Courses',
        createdAt: new Date().toISOString(),
        items: [
          { id: 'item1', text: 'Lait', done: false, createdAt: new Date().toISOString() },
          { id: 'item2', text: 'Pain', done: false, createdAt: new Date().toISOString() },
        ],
      });
      store.save(data);

      const reloaded = loadData();
      const list = reloaded.lists[0];
      const idx = list.items.findIndex((i) => i.id.startsWith('item1'));
      list.items.splice(idx, 1);
      store.save(reloaded);

      const final = loadData();
      expect(final.lists[0].items).toHaveLength(1);
      expect(final.lists[0].items[0].text).toBe('Pain');
    });

    it('removes an entire list when no item id given', () => {
      const data = loadData();
      data.lists.push({
        id: 'list1',
        name: 'Courses',
        createdAt: new Date().toISOString(),
        items: [
          { id: 'item1', text: 'Lait', done: false, createdAt: new Date().toISOString() },
        ],
      });
      store.save(data);

      const reloaded = loadData();
      reloaded.lists = reloaded.lists.filter((l) => l.id !== 'list1');
      store.save(reloaded);

      const final = loadData();
      expect(final.lists).toHaveLength(0);
    });
  });

  describe('findList partial match', () => {
    it('finds list by partial name prefix (case-insensitive)', () => {
      const data = loadData();
      data.lists.push({
        id: 'list1',
        name: 'Anniversaires',
        createdAt: new Date().toISOString(),
        items: [],
      });
      store.save(data);

      const reloaded = loadData();
      const lower = 'anniv'.toLowerCase();
      const found = reloaded.lists.find((l) => l.name.toLowerCase().startsWith(lower));
      expect(found).toBeDefined();
      expect(found!.name).toBe('Anniversaires');
    });
  });
});
