'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, TrendingUp, Clock, Coins } from 'lucide-react';

interface TokenTransaction {
  amount: number;
  reason: string;
  eventType: string;
  timestamp: string;
  xpAwarded: number;
}

interface GreenTokenData {
  balance: number;
  balanceFormatted: string;
  recentTransactions: TokenTransaction[];
  xpPoints: number;
  level: number;
}

interface GreenTokenBalanceProps {
  className?: string;
}

const EVENT_LABELS: Record<string, string> = {
  quiz_completion: 'Quiz Completed',
  project_joined: 'Joined Project',
  tree_planted: 'Planted Trees',
  issue_reported: 'Issue Reported',
  educational_content: 'Learning Activity',
  community_event: 'Community Event',
};

export function GreenTokenBalance({ className }: GreenTokenBalanceProps) {
  const [data, setData] = useState<GreenTokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/balance', { credentials: 'include' });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setData(result);
        } else {
          setError(result.message || 'Failed to load balance');
        }
      } else if (response.status === 401) {
        setError('Please log in to view your GreenToken balance.');
      } else {
        setError('Failed to load GreenToken balance.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-500" />
            GreenTokens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-500" />
            GreenTokens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-emerald-500" />
          GreenTokens
        </CardTitle>
        <CardDescription>
          Earned automatically when you gain XP — stored securely in the cloud.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Balance Display */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
          <div>
            <p className="text-sm text-emerald-700 font-medium">Total Balance</p>
            <p className="text-3xl font-bold text-emerald-800">{data?.balanceFormatted ?? '0 GT'}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Coins className="h-7 w-7 text-emerald-600" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/40 text-center">
            <p className="text-xs text-muted-foreground mb-1">XP Points</p>
            <p className="font-semibold text-foreground flex items-center justify-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              {(data?.xpPoints ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/40 text-center">
            <p className="text-xs text-muted-foreground mb-1">Level</p>
            <p className="font-semibold text-foreground">Level {data?.level ?? 1}</p>
          </div>
        </div>

        {/* Recent transactions */}
        {data && data.recentTransactions.length > 0 && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Recent Rewards
            </p>
            <ul className="space-y-2">
              {data.recentTransactions.slice(0, 5).map((tx, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between text-sm py-2 border-b border-border/40 last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{tx.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {EVENT_LABELS[tx.eventType] ?? tx.eventType} ·{' '}
                      {new Date(tx.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    +{tx.amount} GT
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data && data.recentTransactions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Complete activities to earn GreenTokens!
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          1 XP = 1 GreenToken · Tokens are awarded instantly when XP is earned.
        </p>
      </CardContent>
    </Card>
  );
}
