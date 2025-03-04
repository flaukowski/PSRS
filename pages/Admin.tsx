import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Ban, Coins, Wallet } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useAccount } from "wagmi";

interface AdminUser {
  address: string;
  username: string;
  isAdmin: boolean;
}

interface TreasuryData {
  treasurerAddress: string | null;
  totalRewards: number;
  rewardedUsers: number;
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: treasury, isLoading: treasuryLoading } = useQuery<TreasuryData>({
    queryKey: ["/api/admin/treasury"],
    retry: false,
  });

  const setupAdminMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/setup");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/treasury"] });
      toast({
        title: "Success",
        description: "You are now set up as an admin",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setTreasurerMutation = useMutation({
    mutationFn: async (address: string) => {
      const response = await apiRequest("POST", "/api/admin/gas-recipient", { address });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/treasury"] });
      toast({
        title: "Success",
        description: "Treasurer address updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSetTreasurer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const address = formData.get("treasurerAddress") as string;

    if (!address) {
      toast({
        title: "Error",
        description: "Please enter a treasurer address",
        variant: "destructive",
      });
      return;
    }

    setTreasurerMutation.mutate(address);
    e.currentTarget.reset();
  };

  if (usersLoading || treasuryLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </Layout>
    );
  }

  if (!treasury) {
    return (
      <Layout>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Admin Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              No admin user is set up yet. Would you like to become the admin?
            </p>
            <Button 
              onClick={() => setupAdminMutation.mutate()}
              disabled={setupAdminMutation.isPending}
            >
              Set Up Admin
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Treasury Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Current Treasurer</p>
              <p className="text-sm text-muted-foreground break-all">
                {treasury?.treasurerAddress || "Not set"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Address authorized to manage Treasury operations and receive GAS fees
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">{treasury?.rewardedUsers || 0}</p>
              <p className="text-sm text-muted-foreground">Users Rewarded</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <Coins className="h-4 w-4" />
                <p className="font-medium">{treasury?.totalRewards || 0}</p>
              </div>
              <p className="text-sm text-muted-foreground">PFORK Distributed</p>
            </div>
          </div>

          <form onSubmit={handleSetTreasurer} className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Set New Treasurer Address
                </label>
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <Input
                    name="treasurerAddress"
                    placeholder="Enter NEO X address"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This address will be authorized to manage Treasury operations and receive GAS fees
                </p>
              </div>
              <Button type="submit" disabled={setTreasurerMutation.isPending}>
                Update Treasurer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users?.map((user) => (
              <div key={user.address} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{user.username || "Anonymous"}</p>
                  <p className="text-sm text-muted-foreground">{user.address}</p>
                </div>
                <Button
                  variant={user.isAdmin ? "destructive" : "outline"}
                  onClick={() => toggleAdminMutation.mutate(user.address)}
                >
                  {user.isAdmin ? (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      Remove Admin
                    </>
                  ) : (
                    "Make Admin"
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}