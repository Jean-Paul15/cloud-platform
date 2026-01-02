/**
 * Tests du Service Token
 */

const tokenService = require('../src/services/token.service');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('Token Service', () => {
  describe('generateAccessToken', () => {
    it('devrait generer un JWT avec les bonnes claims', () => {
      jwt.sign.mockReturnValue('mock-jwt-token');

      const user = { id: 'user-123', email: 'test@example.com', role: 'DEVELOPER' };
      const token = tokenService.generateAccessToken(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'DEVELOPER'
        }),
        expect.any(String),
        expect.objectContaining({ expiresIn: expect.any(String) })
      );
      expect(token).toBe('mock-jwt-token');
    });
  });

  describe('generateRefreshToken', () => {
    it('devrait generer un refresh token avec expiration', () => {
      const result = tokenService.generateRefreshToken();

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
      expect(result.token).toHaveLength(64); // 32 bytes en hex
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('verifyAccessToken', () => {
    it('devrait verifier un token valide', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };
      jwt.verify.mockReturnValue(payload);

      const result = tokenService.verifyAccessToken('valid-token');

      expect(result).toEqual(payload);
    });

    it('devrait rejeter un token invalide', () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => tokenService.verifyAccessToken('invalid')).toThrow();
    });
  });
});
