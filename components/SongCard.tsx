import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Plus, Trash2, ListMusic, Coins, Edit, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useContractWrite, useAccount } from 'wagmi';
import { PLAYLIST_NFT_ADDRESS, PLAYLIST_NFT_ABI } from "@/lib/contracts";
import { EditSongDialog } from "./EditSongDialog";
import { useState } from "react";
import { parseEther } from "viem";
import { useDimensionalTranslation } from "@/contexts/LocaleContext";

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash?: string;
  neofsObjectId?: string;
  storageType: 'ipfs' | 'neofs';
  uploadedBy: string | null;
  createdAt: string | null;
  votes: number | null;
  loves?: number;
  isLoved?: boolean;
}

interface SongCardProps {
  song: Song;
  onClick: () => void;
  variant?: "ghost" | "default";
  showDelete?: boolean;
  isPlaying?: boolean;
}

export function SongCard({ song, onClick, variant = "ghost", showDelete = false, isPlaying = false }: SongCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { address } = useAccount();
  const { t } = useDimensionalTranslation();

  // Love mutation
  const loveMutation = useMutation({
    mutationFn: async (songId: number) => {
      const response = await apiRequest("POST", `/api/songs/${songId}/love`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
      toast({
        title: song.isLoved ? t('song.unloved') : t('song.loved'),
        description: song.isLoved ? t('song.unloved.message') : t('song.loved.message'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('song.love.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: playlists } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  // Contract write for minting NFT
  const { writeAsync: mintSongNFT } = useContractWrite({
    address: PLAYLIST_NFT_ADDRESS,
    abi: PLAYLIST_NFT_ABI,
    functionName: 'mintSong',
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ playlistId, songId }: { playlistId: number; songId: number }) => {
      await apiRequest("POST", `/api/playlists/${playlistId}/songs`, { songId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: t('playlist.add.success'),
        description: t('playlist.add.song.success'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('playlist.add.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const mintNFTMutation = useMutation({
    mutationFn: async () => {
      if (!mintSongNFT) throw new Error(t('nft.mint.error.contract'));
      if (!address) throw new Error(t('nft.mint.error.wallet'));

      const metadataUri = `ipfs://${song.ipfsHash}`;

      try {
        const tx = await mintSongNFT({
          args: [
            address,
            song.title,
            song.artist,
            song.ipfsHash,
            metadataUri
          ],
          value: parseEther("1"), // 1 GAS
        });

        await tx.wait();
      } catch (error: any) {
        throw new Error(error.message || t('nft.mint.error.generic'));
      }
    },
    onSuccess: () => {
      toast({
        title: t('nft.mint.success'),
        description: t('nft.mint.success.message'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('nft.mint.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: async (songId: number) => {
      await apiRequest("DELETE", `/api/songs/${songId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/library"] });
      toast({
        title: t('song.delete.success'),
        description: t('song.delete.success.message'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('song.delete.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <div className="flex items-center justify-between group">
        <Button
          variant={variant}
          className={`flex-1 justify-start ${isPlaying ? 'bg-accent' : ''}`}
          onClick={onClick}
        >
          <span className="truncate">{song.title}</span>
          <span className="ml-2 text-muted-foreground">- {song.artist}</span>
          {song.storageType === 'neofs' && (
            <span className="ml-2 text-xs text-muted-foreground">(NeoFS)</span>
          )}
        </Button>

        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className={`mr-2 ${song.isLoved ? 'text-red-500' : 'text-muted-foreground'} opacity-0 group-hover:opacity-100 transition-opacity`}
            onClick={() => loveMutation.mutate(song.id)}
          >
            <Heart className={`h-4 w-4 ${song.isLoved ? 'fill-current' : ''}`} />
            {song.loves && song.loves > 0 && (
              <span className="ml-1 text-xs">{song.loves}</span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {showDelete && (
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('song.edit.details')}
                </DropdownMenuItem>
              )}

              {!playlists?.length ? (
                <DropdownMenuItem className="text-muted-foreground" disabled>
                  <ListMusic className="mr-2 h-4 w-4" />
                  {t('playlist.create.first')}
                </DropdownMenuItem>
              ) : (
                playlists.map((playlist) => (
                  <DropdownMenuItem
                    key={playlist.id}
                    onClick={() => {
                      addToPlaylistMutation.mutate({
                        playlistId: playlist.id,
                        songId: song.id,
                      });
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('playlist.add.to', { name: playlist.name })}
                  </DropdownMenuItem>
                ))
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => {
                  if (window.confirm(t('nft.mint.confirm'))) {
                    mintNFTMutation.mutate();
                  }
                }}
                disabled={mintNFTMutation.isPending || !address}
              >
                <Coins className="mr-2 h-4 w-4" />
                {t('nft.mint')}
              </DropdownMenuItem>

              {showDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (window.confirm(t('song.delete.confirm'))) {
                        deleteSongMutation.mutate(song.id);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('song.delete.library')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <EditSongDialog
        song={song}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="edit"
      />
    </>
  );
}