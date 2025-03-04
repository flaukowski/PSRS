import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from 'wagmi';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, File } from "lucide-react";
import { uploadToNeoFS, listNeoFSFiles, downloadNeoFSFile, type NeoFSFile } from "@/lib/neoStorage";
import { useIntl } from 'react-intl';
import { EditSongDialog } from "./EditSongDialog";

export function NeoStorage() {
  const [uploadLoading, setUploadLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { address } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const intl = useIntl();

  // Query for listing files
  const { data: files = [], isLoading } = useQuery<NeoFSFile[]>({
    queryKey: [`/api/neo-storage/files/${address}`],
    enabled: !!address,
  });

  // Handle initial file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !address) {
      toast({
        title: "Error",
        description: intl.formatMessage({ id: 'app.errors.upload' }),
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setDialogOpen(true);
  };

  // Handle the actual file upload after metadata input and GAS confirmation
  const handleFileUpload = async (metadata: { title: string; artist: string }) => {
    if (!selectedFile || !address) return;

    try {
      setUploadLoading(true);
      console.log('Starting file upload:', {
        name: selectedFile.name,
        size: `${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB`,
        type: selectedFile.type,
        address: address
      });

      const result = await uploadToNeoFS(selectedFile, address);
      console.log('Upload completed successfully:', result);

      queryClient.invalidateQueries({ queryKey: [`/api/neo-storage/files/${address}`] });
      toast({
        title: "Success",
        description: intl.formatMessage({ id: 'storage.success' }),
      });

      // Reset state
      setSelectedFile(null);
      setDialogOpen(false);
    } catch (error) {
      console.error('Upload error details:', error);

      // Handle specific error types
      let errorMessage = error instanceof Error ? error.message : intl.formatMessage({ id: 'storage.error' });

      // Check for timeout or network errors
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Upload timed out. Please try again with a smaller file.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error occurred. Please check your connection and try again.';
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{intl.formatMessage({ id: 'storage.title' })}</h2>
        <div className="flex items-center gap-4">
          <Input
            type="file"
            onChange={handleFileSelect}
            accept="audio/mpeg,audio/mp3"
            id="neo-fs-upload"
            disabled={uploadLoading}
          />
          <label htmlFor="neo-fs-upload">
            <Button variant="outline" asChild disabled={uploadLoading}>
              <span>
                {uploadLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {intl.formatMessage({ id: 'storage.uploading' })}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {intl.formatMessage({ id: 'storage.upload' })}
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Metadata Input Dialog */}
      <EditSongDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="create"
        onSubmit={handleFileUpload}
        fileSize={selectedFile?.size}
        onGasConfirm={() => {
          console.log('GAS payment confirmed');
        }}
      />

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {intl.formatMessage({ id: 'storage.noFiles' })}
          </p>
        ) : (
          <div className="grid gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center space-x-4">
                  <File className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}