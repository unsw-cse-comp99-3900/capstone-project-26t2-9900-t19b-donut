import { describe, it, expect } from 'vitest';
import { broadcastGroupQueries, broadcastChannelQueries, broadcastQueries, groupParticipantQueries, broadcastNotificationQueries } from '../broadcasts.queries';

describe('broadcasts.queries', () => {
    it('should export query objects', () => {
        expect(broadcastGroupQueries).toBeDefined();
        expect(broadcastChannelQueries).toBeDefined();
        expect(broadcastQueries).toBeDefined();
        expect(groupParticipantQueries).toBeDefined();
        expect(broadcastNotificationQueries).toBeDefined();
    });

    it('broadcastGroupQueries.getAll should be a function', () => {
        expect(typeof broadcastGroupQueries.getAll).toBe('function');
    });
});
