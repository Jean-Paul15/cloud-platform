/**
 * Tests du Service Manager
 * Mis a jour pour la nouvelle structure modulaire
 */

const instanceService = require('../src/services/instance.service');
const instanceCrud = require('../src/repositories/instance.crud');
const instanceMutations = require('../src/repositories/instance.mutations');

// Mocks
jest.mock('../src/repositories/instance.crud');
jest.mock('../src/repositories/instance.mutations');

describe('Instance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('devrait creer une nouvelle instance', async () => {
      instanceCrud.findByUserId.mockResolvedValue([]);
      instanceCrud.create.mockResolvedValue({
        _id: 'instance-uuid',
        user_id: 'user-123',
        name: 'test-db',
        status: 'RUNNING',
        created_at: new Date()
      });

      const result = await instanceService.create('test-db', 'user-123');

      expect(result.name).toBe('test-db');
      expect(instanceCrud.create).toHaveBeenCalled();
    });

    it('devrait rejeter si le nom existe deja', async () => {
      instanceCrud.findByUserId.mockResolvedValue([
        { name: 'existing-db', user_id: 'user-123' }
      ]);

      await expect(
        instanceService.create('existing-db', 'user-123')
      ).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('devrait retourner les instances de utilisateur', async () => {
      const instances = [
        { _id: '1', name: 'db1', user_id: 'user-123' },
        { _id: '2', name: 'db2', user_id: 'user-123' }
      ];
      instanceCrud.findByUserId.mockResolvedValue(instances);

      const result = await instanceService.list('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('db1');
    });
  });

  describe('getById', () => {
    it('devrait retourner une instance par id', async () => {
      instanceCrud.findById.mockResolvedValue({
        _id: 'instance-123',
        name: 'my-db',
        user_id: 'user-123'
      });

      const result = await instanceService.getById('instance-123', 'user-123');

      expect(result.name).toBe('my-db');
    });

    it('devrait rejeter si pas proprietaire', async () => {
      instanceCrud.findById.mockResolvedValue({
        _id: 'instance-123',
        user_id: 'other-user'
      });

      await expect(
        instanceService.getById('instance-123', 'user-123')
      ).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('devrait supprimer une instance', async () => {
      instanceCrud.findById.mockResolvedValue({
        _id: 'instance-123',
        user_id: 'user-123'
      });
      instanceCrud.remove.mockResolvedValue(true);

      const result = await instanceService.remove('instance-123', 'user-123');

      expect(result).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('devrait changer le statut', async () => {
      instanceCrud.findById.mockResolvedValue({
        _id: 'instance-123',
        user_id: 'user-123',
        status: 'RUNNING'
      });
      instanceMutations.updateStatus.mockResolvedValue({
        _id: 'instance-123',
        status: 'STOPPED'
      });

      const result = await instanceService.updateStatus('instance-123', 'STOPPED', 'user-123');

      expect(result.status).toBe('STOPPED');
    });
  });

  describe('scale', () => {
    it('devrait changer les ressources', async () => {
      instanceCrud.findById.mockResolvedValue({
        _id: 'instance-123',
        user_id: 'user-123',
        resources: { cpu: 1, memory: 512 }
      });
      instanceMutations.updateResources.mockResolvedValue({
        _id: 'instance-123',
        resources: { cpu: 2, memory: 1024 }
      });

      const result = await instanceService.scale('instance-123', { cpu: 2, memory: 1024 }, 'user-123');

      expect(result.resources.cpu).toBe(2);
    });
  });
});
