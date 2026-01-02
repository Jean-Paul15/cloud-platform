/**
 * Tests du Repository Project
 */

const projectRepo = require('../src/repositories/project.repository');
const { prisma } = require('../src/config/database');

jest.mock('../src/config/database', () => ({
  prisma: {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn()
    }
  }
}));

describe('Project Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('devrait creer un projet', async () => {
      const projectData = { userId: 'user-123', name: 'Mon Projet' };
      prisma.project.create.mockResolvedValue({
        id: 'project-uuid',
        ...projectData
      });

      const result = await projectRepo.create(projectData);

      expect(result.name).toBe('Mon Projet');
      expect(prisma.project.create).toHaveBeenCalledWith({ data: projectData });
    });
  });

  describe('findByUserId', () => {
    it('devrait retourner les projets de l utilisateur', async () => {
      prisma.project.findMany.mockResolvedValue([
        { id: '1', name: 'Projet 1' },
        { id: '2', name: 'Projet 2' }
      ]);

      const result = await projectRepo.findByUserId('user-123');

      expect(result).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('devrait trouver un projet par ID', async () => {
      prisma.project.findUnique.mockResolvedValue({
        id: 'project-123',
        name: 'Mon Projet'
      });

      const result = await projectRepo.findById('project-123');

      expect(result.id).toBe('project-123');
    });
  });

  describe('remove', () => {
    it('devrait supprimer un projet', async () => {
      prisma.project.delete.mockResolvedValue({ id: 'project-123' });

      await projectRepo.remove('project-123');

      expect(prisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'project-123' }
      });
    });
  });
});
