'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useServiceOrder } from '../hooks/UseServiceOrder';
import { useUploadDeliverable } from '../hooks/UseUploadDeliverable';
import { useMarkDelivered } from '../hooks/UseMarkDelivered';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Send, FileVideo, FileAudio, FileText, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { FileUploader } from '../_components/FileUploader';
import { toast } from 'sonner';
import UseMerchantIdFromSlug from '@/app/(site)/m/_hooks/UseMerchantIdFromSlug';

export default function FulfillmentPage({ params }: { params: Promise<{ merchant_slug: string; orderId: string }> }) {
  const { merchant_slug, orderId } = use(params);
  const router = useRouter();
  const { data: merchantData } = UseMerchantIdFromSlug(merchant_slug);
  const merchantId = merchantData?.merchantId;

  const [practitionerMessage, setPractitionerMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { data: order, isLoading } = useServiceOrder(orderId);
  const uploadMutation = useUploadDeliverable();
  const markDeliveredMutation = useMarkDelivered();

  const handleUpload = async () => {
    if (!merchantId) return;
    if (selectedFiles.length === 0) {
      toast.error('No files selected', {
        description: 'Please select at least one file to upload'
      });
      return;
    }

    try {
      // Step 1: Upload files to Azure Blob Storage
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const uploadResponse = await fetch('/api/azure_upload', {
        method: 'POST',
        headers: {
          'container': 'public',
          'relative_path': `service-deliverables/${merchantId}/${orderId}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload files to Azure');
      }

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.ok || !uploadResult.uploaded) {
        throw new Error('Azure upload failed');
      }

      // Step 2: Create deliverable records with the uploaded file URLs
      const fileMetadata = uploadResult.uploaded.map((uploadedFile: any, index: number) => ({
        name: uploadedFile.name,
        type: selectedFiles[index].type.startsWith('video/') ? 'VIDEO' :
              selectedFiles[index].type.startsWith('audio/') ? 'AUDIO' :
              selectedFiles[index].type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
        mimeType: selectedFiles[index].type,
        size: uploadedFile.sizeBytes,
        url: uploadedFile.url
      }));

      await uploadMutation.mutateAsync({
        vendorId: merchantId,
        orderId,
        files: fileMetadata,
        message: practitionerMessage
      });

      toast.success('Files uploaded successfully', {
        description: 'Your deliverables have been uploaded'
      });

      setSelectedFiles([]);
      setPractitionerMessage('');
    } catch (error) {
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
    }
  };

  const handleMarkDelivered = async () => {
    if (!merchantId) return;
    if (!order?.deliverables?.files || order.deliverables.files.length === 0) {
      toast.error('No deliverables', {
        description: 'Please upload at least one file before marking as delivered'
      });
      return;
    }

    try {
      await markDeliveredMutation.mutateAsync({
        vendorId: merchantId,
        orderId
      });

      toast.success('Order marked as delivered!', {
        description: 'The customer has been notified'
      });

      router.push(`/m/${merchant_slug}/manage/services/orders`);
    } catch (error) {
      toast.error('Failed to mark as delivered', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'VIDEO': return <FileVideo className="h-4 w-4" />;
      case 'AUDIO': return <FileAudio className="h-4 w-4" />;
      case 'IMAGE': return <ImageIcon className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (!merchantId || isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <p>Loading...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <p>Order not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link
        href={`/m/${merchant_slug}/manage/services/orders`}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge>{order.service.category}</Badge>
                <CardTitle className="text-2xl">{order.service.name}</CardTitle>
              </div>
              <CardDescription>
                Order #{order.id.slice(0, 8)} • Purchased {format(new Date(order.purchaseDate), "MMM d, yyyy 'at' h:mm a")}
              </CardDescription>
            </div>
            <Badge variant={order.orderStatus === 'DELIVERED' ? 'outline' : 'default'}>
              {order.orderStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">Customer</p>
              <p className="text-muted-foreground">#{order.customerId.slice(0, 8)}</p>
            </div>
            <div>
              <p className="font-medium">Price</p>
              <p className="text-muted-foreground">
                {order.price.currency.toUpperCase()} {(order.price.amount / 100).toFixed(2)}
              </p>
            </div>
            {order.service.turnaroundDays && (
              <div>
                <p className="font-medium">Due Date</p>
                <p className="text-muted-foreground">
                  {format(
                    new Date(new Date(order.purchaseDate).getTime() + order.service.turnaroundDays * 24 * 60 * 60 * 1000),
                    'MMM d, yyyy'
                  )}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {order.questionnaireResponses && order.questionnaireResponses.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Client Intake Responses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.questionnaireResponses.map((response, idx) => (
              <div key={idx}>
                <p className="font-medium text-sm">{response.question}</p>
                <p className="text-muted-foreground">{response.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Deliverables</CardTitle>
          <CardDescription>
            Upload your reading, healing report, or session recording for the client
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.deliverables?.files && order.deliverables.files.length > 0 && (
            <div>
              <p className="font-medium mb-2">Uploaded Files:</p>
              <div className="space-y-2">
                {order.deliverables.files.map((file) => (
                  <Card key={file.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      {getFileIcon(file.type)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • Uploaded {format(new Date(file.uploadedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {order.orderStatus !== 'DELIVERED' && (
            <>
              <Separator />
              <FileUploader
                onFilesSelected={setSelectedFiles}
                disabled={uploadMutation.isPending}
              />
              {selectedFiles.length > 0 && (
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  className="w-full"
                >
                  {uploadMutation.isPending ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`}
                </Button>
              )}
            </>
          )}

          {order.orderStatus !== 'DELIVERED' && (
            <>
              <Separator />
              <div>
                <label className="font-medium mb-2 block">Message for Client (Optional)</label>
                <Textarea
                  placeholder="Add any notes, instructions, or insights for the client..."
                  value={practitionerMessage}
                  onChange={(e) => setPractitionerMessage(e.target.value)}
                  rows={5}
                  disabled={uploadMutation.isPending || markDeliveredMutation.isPending}
                />
              </div>
            </>
          )}

          {order.deliverables?.message && (
            <div>
              <p className="font-medium mb-2">Your Message:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {order.deliverables.message}
              </p>
            </div>
          )}
        </CardContent>

        {order.orderStatus !== 'DELIVERED' && (
          <CardFooter>
            <Button
              onClick={handleMarkDelivered}
              disabled={!order.deliverables?.files || order.deliverables.files.length === 0 || markDeliveredMutation.isPending}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {markDeliveredMutation.isPending ? 'Marking as Delivered...' : 'Mark as Delivered & Notify Client'}
            </Button>
          </CardFooter>
        )}
      </Card>

      {order.orderStatus === 'DELIVERED' && order.deliverables?.deliveredAt && (
        <div className="text-center text-muted-foreground">
          <p>✓ This order was delivered on {format(new Date(order.deliverables.deliveredAt), "MMM d, yyyy 'at' h:mm a")}</p>
        </div>
      )}
    </div>
  );
}
