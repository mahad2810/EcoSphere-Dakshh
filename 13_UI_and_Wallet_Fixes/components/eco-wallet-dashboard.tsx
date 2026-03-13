'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wallet, 
  CheckCircle, 
  Coins, 
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

interface EcoWalletDashboardProps {
  className?: string;
  userId?: string;
}

interface EcoTokenBalance {
  balance: string;
  balanceFormatted: string;
  lastUpdated: string;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function EcoWalletDashboard({ className, userId = "68a9267e8ab481725758febd" }: EcoWalletDashboardProps) {
  const FIXED_WALLET_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const [currentAddress, setCurrentAddress] = useState<string | null>(FIXED_WALLET_ADDRESS);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [ecoTokenBalance, setEcoTokenBalance] = useState<EcoTokenBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsInitialLoading(false);
    loadEcoTokenBalance();
  }, []);

  const loadEcoTokenBalance = async () => {
    setIsLoadingBalance(true);
    
    try {
      const response = await fetch('/api/user/balance', { credentials: 'include' });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEcoTokenBalance({
            balance: data.balance.toString(),
            balanceFormatted: data.balanceFormatted || `${data.balance} GreenTokens`,
            lastUpdated: new Date().toLocaleString()
          });
        } else {
          throw new Error('Fallback to backup');
        }
      } else {
        throw new Error('API failure');
      }
    } catch (error) {
      setEcoTokenBalance({
        balance: '0',
        balanceFormatted: '0 GreenTokens',
        lastUpdated: new Date().toLocaleString()
      });
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(FIXED_WALLET_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  if (isInitialLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            EcoWallet Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          EcoWallet Dashboard
        </CardTitle>
        <CardDescription>
          Your EcoToken balance and wallet information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wallet Address */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium">Wallet Connected</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <div className="text-sm text-muted-foreground font-mono break-all flex-1">
              {FIXED_WALLET_ADDRESS}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAddress}
              className="h-6 w-6 p-0"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* EcoToken Balance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Coins className="h-4 w-4" />
              EcoToken Balance
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadEcoTokenBalance}
              disabled={isLoadingBalance}
              className="h-8 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingBalance ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
            {isLoadingBalance ? (
              <div className="text-center py-2">
                <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
                <div className="text-sm">Loading balance...</div>
              </div>
            ) : ecoTokenBalance ? (
              <div>
                <div className="text-2xl font-bold text-green-700">
                  {ecoTokenBalance.balanceFormatted}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Last updated: {ecoTokenBalance.lastUpdated}
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="text-muted-foreground mb-2">Unable to load balance</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadEcoTokenBalance}
                  className="text-xs"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadEcoTokenBalance}
            disabled={isLoadingBalance}
            className="flex-1"
          >
            {isLoadingBalance ? 'Refreshing...' : 'Refresh Balance'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
