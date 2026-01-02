/**
 * Tests du Service d'Authentification
 * Mis a jour pour la nouvelle structure modulaire
 */

const authService = require('../src/services/auth.service');
const userRepo = require('../src/repositories/user.repository');
const tokenRepo = require('../src/repositories/token.repository');
const tokenService = require('../src/services/token.service');
const { hashPassword, verifyPassword } = require('../src/services/password.service');

// Mocks
jest.mock('../src/repositories/user.repository');
jest.mock('../src/repositories/token.repository');
jest.mock('../src/services/token.service');
jest.mock('../src/services/password.service');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('devrait creer un utilisateur avec tokens', async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      hashPassword.mockResolvedValue('hashed-password');
      userRepo.create.mockResolvedValue({
        id: 'uuid-123',
        email: 'test@example.com',
        role: 'DEVELOPER'
      });
      tokenService.generateAccessToken.mockReturnValue('access-token');
      tokenService.generateRefreshToken.mockReturnValue({
        token: 'refresh-token',
        expiresAt: new Date()
      });
      tokenRepo.create.mockResolvedValue({});

      const result = await authService.register('test@example.com', 'SecurePass123!');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(tokenRepo.create).toHaveBeenCalled();
    });

    it('devrait rejeter si email existe deja', async () => {
      userRepo.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        authService.register('existing@example.com', 'password')
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('devrait connecter avec credentials valides', async () => {
      userRepo.findByEmail.mockResolvedValue({
        id: 'uuid-123',
        email: 'test@example.com',
        passwordHash: 'hashed',
        role: 'DEVELOPER'
      });
      verifyPassword.mockResolvedValue(true);
      tokenService.generateAccessToken.mockReturnValue('access-token');
      tokenService.generateRefreshToken.mockReturnValue({
        token: 'refresh-token',
        expiresAt: new Date()
      });
      tokenRepo.create.mockResolvedValue({});

      const result = await authService.login('test@example.com', 'password');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('devrait rejeter avec mauvais password', async () => {
      userRepo.findByEmail.mockResolvedValue({
        id: 'uuid-123',
        passwordHash: 'hashed'
      });
      verifyPassword.mockResolvedValue(false);

      await expect(
        authService.login('test@example.com', 'wrong')
      ).rejects.toThrow('incorrect');
    });
  });

  describe('refresh', () => {
    it('devrait rafraichir les tokens avec rotation', async () => {
      tokenRepo.findByToken.mockResolvedValue({
        userId: 'user-123',
        token: 'old-refresh',
        expiresAt: new Date(Date.now() + 86400000)
      });
      userRepo.findById.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com'
      });
      tokenRepo.deleteByToken.mockResolvedValue({});
      tokenService.generateAccessToken.mockReturnValue('new-access');
      tokenService.generateRefreshToken.mockReturnValue({
        token: 'new-refresh',
        expiresAt: new Date()
      });
      tokenRepo.create.mockResolvedValue({});

      const result = await authService.refresh('old-refresh');

      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
      expect(tokenRepo.deleteByToken).toHaveBeenCalledWith('old-refresh');
    });

    it('devrait rejeter si refresh token expire', async () => {
      tokenRepo.findByToken.mockResolvedValue({
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 1000)
      });
      tokenRepo.deleteByToken.mockResolvedValue({});

      await expect(authService.refresh('expired-token')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('devrait supprimer le refresh token', async () => {
      tokenRepo.deleteByToken.mockResolvedValue({});

      await authService.logout('refresh-token');

      expect(tokenRepo.deleteByToken).toHaveBeenCalledWith('refresh-token');
    });
  });
});
