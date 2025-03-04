import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useContractRead, useContractWrite } from 'wagmi';
import { Coins, Send } from "lucide-react";
import { useState } from "react";
import { TREASURY_ADDRESS, TREASURY_ABI, PFORK_TOKEN_ADDRESS, PFORK_TOKEN_ABI } from "@/lib/contracts";
import { useDimensionalTranslation } from "@/contexts/LocaleContext";

interface TreasuryData {
  treasurerAddress: string;
  pforkBalance: string;
  gasBalance: string;
  isCurrentManager: boolean;
}

export default function Treasury() {
  const { toast } = useToast();
  const { address } = useAccount();
  const { t } = useDimensionalTranslation();
  const [newTreasuryAddress, setNewTreasuryAddress] = useState("");

  // Read PFORK balance of Treasury contract
  const { data: pforkBalance } = useContractRead({
    address: PFORK_TOKEN_ADDRESS,
    abi: PFORK_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [TREASURY_ADDRESS],
  });

  // Read current treasurer
  const { data: ownerAddress } = useContractRead({
    address: TREASURY_ADDRESS,
    abi: TREASURY_ABI,
    functionName: 'owner',
  });

  // Contract write mutation
  const { write: transferTreasury } = useContractWrite({
    address: TREASURY_ADDRESS,
    abi: TREASURY_ABI,
    functionName: 'transferTreasury',
  });

  // Mutation for updating treasurer address
  const updateTreasuryMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("No wallet connected");
      if (!transferTreasury) throw new Error("Contract write not ready");

      transferTreasury({
        args: [newTreasuryAddress as `0x${string}`],
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Treasury manager transfer initiated. Please wait for the transaction to be mined.",
      });
      setNewTreasuryAddress("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const treasury: TreasuryData = {
    treasurerAddress: ownerAddress as string,
    pforkBalance: pforkBalance ? (Number(pforkBalance) / 1e18).toString() : "0",
    gasBalance: "0",
    isCurrentManager: address === ownerAddress,
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Treasury Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('treasury.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground break-all">
                {TREASURY_ADDRESS}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t('treasury.description')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('treasury.balance.pfork')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                <p className="text-2xl font-bold">{treasury.pforkBalance}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('treasury.balance.pfork.description')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('treasury.balance.gas')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                <p className="text-2xl font-bold">{treasury.gasBalance}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('treasury.balance.gas.description')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Treasury Management - Only visible to current treasurer */}
        {treasury.isCurrentManager && (
          <Card>
            <CardHeader>
              <CardTitle>{t('treasury.management')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">{t('treasury.current')}</label>
                  <p className="text-sm text-muted-foreground break-all">
                    {treasury.treasurerAddress}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('treasury.current.description')}
                  </p>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">{t('treasury.new')}</label>
                  <Input
                    value={newTreasuryAddress}
                    onChange={(e) => setNewTreasuryAddress(e.target.value)}
                    placeholder={t('treasury.new')}
                  />
                </div>
                <Button
                  onClick={() => {
                    if (window.confirm(t('treasury.confirm'))) {
                      updateTreasuryMutation.mutate();
                    }
                  }}
                  disabled={!newTreasuryAddress || updateTreasuryMutation.isPending}
                >
                  {t('treasury.transfer')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PFORK Distribution Rules */}
        <Card>
          <CardHeader>
            <CardTitle>{t('treasury.distribution')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">{t('treasury.rewards.title')}</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>{t('treasury.rewards.upload')}</li>
                <li>{t('treasury.rewards.playlist')}</li>
                <li>{t('treasury.rewards.nft')}</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('treasury.rewards.note')}
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}