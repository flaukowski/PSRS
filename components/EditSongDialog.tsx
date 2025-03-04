import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { calculateNeoGas } from "@/lib/neoStorage";

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string;
}

interface EditSongDialogProps {
  song?: Song;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'edit' | 'create';
  onSubmit?: (data: { title: string; artist: string }) => void;
  fileSize?: number;
  onGasConfirm?: () => void;
}

export function EditSongDialog({
  song,
  open,
  onOpenChange,
  mode,
  onSubmit,
  fileSize,
  onGasConfirm
}: EditSongDialogProps) {
  const [title, setTitle] = React.useState(song?.title || '');
  const [artist, setArtist] = React.useState(song?.artist || '');
  const [gasAmount, setGasAmount] = React.useState<string>('0');
  const [gasLoading, setGasLoading] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (song) {
      setTitle(song.title);
      setArtist(song.artist);
    }

    // Calculate required GAS if file size is provided
    if (fileSize && mode === 'create') {
      setGasLoading(true);
      calculateNeoGas(fileSize)
        .then(({ requiredGas }) => {
          setGasAmount(requiredGas);
        })
        .catch(error => {
          console.error('Error calculating GAS:', error);
          toast({
            title: "Error",
            description: "Failed to calculate required GAS. Please try again.",
            variant: "destructive",
          });
        })
        .finally(() => {
          setGasLoading(false);
        });
    }
  }, [song, fileSize, mode]);

  const editSongMutation = useMutation({
    mutationFn: async (data: { title: string; artist: string }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/songs/${song?.id}`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
      toast({
        title: "Success",
        description: "Song updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !artist) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (mode === 'create' && fileSize) {
      // Confirm GAS payment before proceeding
      const confirmed = window.confirm(
        `This upload requires ${gasAmount} GAS. Do you want to proceed with the payment?`
      );

      if (!confirmed) {
        return;
      }

      // Notify parent about GAS confirmation
      onGasConfirm?.();
    }

    if (mode === 'edit') {
      editSongMutation.mutate({ title, artist });
    } else if (onSubmit) {
      onSubmit({ title, artist });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'edit' ? 'Edit Song Details' : 'New Song Details'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'edit'
                ? 'Update the title and artist for this song.'
                : `Enter the title and artist for your new song.${
                    fileSize
                      ? gasLoading
                        ? ' Calculating GAS...'
                        : ` Required GAS: ${gasAmount}`
                      : ''
                  }`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter song title"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="artist" className="text-sm font-medium">
                Artist
              </label>
              <Input
                id="artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Enter artist name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={!title || !artist || editSongMutation.isPending || gasLoading}
            >
              {mode === 'edit' ? 'Save Changes' : fileSize ? 'Proceed to Payment' : 'Create Song'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}