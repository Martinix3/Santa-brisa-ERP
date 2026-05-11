"use client";
/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


import { useState } from 'react';
import type { TimelineEvent } from '@/server/actions/accounts';
import { AccountTimeline } from '@/components/accounts/AccountTimeline';
import { getAccountTimeline } from '@/server/actions/accounts';

export default function TimelineSection({ accountId, initialEvents, initialHasMore }: { accountId: string; initialEvents: TimelineEvent[]; initialHasMore: boolean }) {
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [loading, setLoading] = useState(false);

  const onLoadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await getAccountTimeline(accountId, { limit: 20, offset: events.length });
      if (res.success) {
        setEvents(prev => [...prev, ...(res.data || [])]);
        setHasMore(!!res.hasMore);
      }
    } catch (e) {
      console.error('[TimelineSection] load more failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AccountTimeline events={events} onLoadMore={onLoadMore} hasMore={hasMore} loading={loading} />
  );
}

