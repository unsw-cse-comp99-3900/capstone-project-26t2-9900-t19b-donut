import { describe, it, expect } from 'vitest';
import {
  mapRole,
  hasPersonalAccess,
  hasManagerialAccess,
  hasAccess,
  isPersonalOnly,
  getManagerialLevel,
} from './access.policy';
import { AccessCertificate, User } from './types';

describe('access.policy', () => {
  describe('mapRole', () => {
    it('should map known roles correctly', () => {
      expect(mapRole('admin')).toBe('admin');
      expect(mapRole('manager')).toBe('manager');
      expect(mapRole('team_lead')).toBe('teamlead');
      expect(mapRole('team_member')).toBe('member');
    });

    it('should map unknown or null roles to member', () => {
      expect(mapRole('unknown_role')).toBe('member');
      expect(mapRole(null)).toBe('member');
      expect(mapRole('')).toBe('member');
    });

    it('should be case insensitive', () => {
      expect(mapRole('ADMIN')).toBe('admin');
      expect(mapRole('Team_Lead')).toBe('teamlead');
    });
  });

  const mockCert = (type: 'X' | 'Y', level: any, isActive = true): AccessCertificate => ({
    id: `cert-${level}`,
    userId: 'user-1',
    organizationId: 'org-1',
    organizationName: 'Org 1',
    departmentId: null,
    subDepartmentId: null,
    certificateType: type,
    accessLevel: level,
    status: isActive ? 'Active' : 'Revoked',
    isActive,
    issuedAt: new Date().toISOString(),
    expiresAt: null,
  });

  describe('hasPersonalAccess', () => {
    it('should return true if active Type X cert meets required level', () => {
      const certs = [mockCert('X', 'beta')];
      expect(hasPersonalAccess(certs, 'my_roster')).toBe(true); // requires alpha
      expect(hasPersonalAccess(certs, 'timesheets_view')).toBe(true); // requires beta
    });

    it('should return false if active Type X cert does not meet required level', () => {
      const certs = [mockCert('X', 'alpha')];
      expect(hasPersonalAccess(certs, 'timesheets_view')).toBe(false); // requires beta
    });

    it('should return false if cert is not active', () => {
      const certs = [mockCert('X', 'beta', false)];
      expect(hasPersonalAccess(certs, 'timesheets_view')).toBe(false);
    });

    it('should return false if required feature does not exist', () => {
      const certs = [mockCert('X', 'beta')];
      expect(hasPersonalAccess(certs, 'unknown_feature')).toBe(false);
    });
  });

  describe('hasManagerialAccess', () => {
    it('should return true if active Type Y cert meets required level', () => {
      const certs = [mockCert('Y', 'delta')];
      expect(hasManagerialAccess(certs, 'templates')).toBe(true); // requires gamma
      expect(hasManagerialAccess(certs, 'rosters')).toBe(true); // requires delta
    });

    it('should return false if active Type Y cert does not meet required level', () => {
      const certs = [mockCert('Y', 'gamma')];
      expect(hasManagerialAccess(certs, 'users')).toBe(false); // requires epsilon
    });

    it('should return false if no active Type Y cert exists', () => {
      const certs = [mockCert('X', 'beta'), mockCert('Y', 'gamma', false)];
      expect(hasManagerialAccess(certs, 'templates')).toBe(false);
    });

    it('should return false if feature does not exist', () => {
      const certs = [mockCert('Y', 'delta')];
      expect(hasManagerialAccess(certs, 'unknown_feature')).toBe(false);
    });
  });

  describe('hasAccess', () => {
    const mockUser: User = {
      id: 'user-1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'member',
      contracts: [],
      certificates: [],
      skills: [],
      availability: [],
      metadata: {},
      createdAt: '',
      updatedAt: '',
    };

    it('should return false if user is null', () => {
      expect(hasAccess(null, 'my_roster')).toBe(false);
    });

    it('should delegate to hasPersonalAccess for personal pages', () => {
      const userWithX = { ...mockUser, certificates: [mockCert('X', 'alpha')] };
      expect(hasAccess(userWithX, 'my_roster')).toBe(true);
      expect(hasAccess(userWithX, 'timesheets_view')).toBe(false); // beta required
    });

    it('should delegate to hasManagerialAccess for managerial pages', () => {
      const userWithY = { ...mockUser, certificates: [mockCert('Y', 'gamma')] };
      expect(hasAccess(userWithY, 'templates')).toBe(true);
      expect(hasAccess(userWithY, 'configs')).toBe(false); // delta required
    });

    it('should fallback to activeCertificate check if feature is unknown but has fallback required level', () => {
      const activeCert = mockCert('X', 'zeta');
      expect(hasAccess(mockUser, 'unknown_feature', null, activeCert)).toBe(true); // requires delta by default
      
      const lowCert = mockCert('X', 'alpha');
      expect(hasAccess(mockUser, 'unknown_feature', null, lowCert)).toBe(false);
    });

    it('should fallback to any active certificate if activeCertificate is null', () => {
      const userWithCert = { ...mockUser, certificates: [mockCert('Y', 'epsilon')] };
      expect(hasAccess(userWithCert, 'unknown_feature')).toBe(true);
    });
  });

  describe('isPersonalOnly', () => {
    it('should return true if no active Type Y certs exist', () => {
      expect(isPersonalOnly([mockCert('X', 'beta')])).toBe(true);
      expect(isPersonalOnly([mockCert('Y', 'gamma', false)])).toBe(true); // Inactive Y
    });

    it('should return false if an active Type Y cert exists', () => {
      expect(isPersonalOnly([mockCert('X', 'beta'), mockCert('Y', 'gamma')])).toBe(false);
    });
  });

  describe('getManagerialLevel', () => {
    it('should return the level of the active Type Y cert', () => {
      expect(getManagerialLevel([mockCert('Y', 'delta')])).toBe('delta');
    });

    it('should return null if no active Type Y cert exists', () => {
      expect(getManagerialLevel([mockCert('X', 'beta')])).toBe(null);
      expect(getManagerialLevel([mockCert('Y', 'delta', false)])).toBe(null);
    });
  });
});
