'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Upload,
  FileVideo,
  FileAudio,
  FileText,
  Image as ImageIcon,
  Send,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  Heart,
  MessageCircle,
  User,
  Calendar,
  Package,
  Star,
  MapPin,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FileUploader from '@/components/ux/FileUploader';
import { media_type } from '@/utils/spiriverse';
import { format } from 'date-fns';
import { useUploadDeliverable } from '../hooks/UseUploadDeliverable';
import { useMarkDelivered } from '../hooks/UseMarkDelivered';
import { useCustomerBirthChart } from '../hooks/UseCustomerBirthChart';
import { toast } from 'sonner';

interface ServiceOrder {
  id: string;
  customerId: string;
  vendorId: string;
  purchaseDate: string;
  orderStatus: string;
  service: {
    id: string;
    name: string;
    category: string;
    turnaroundDays?: number;
    readingOptions?: {
      readingType?: string;
      requiresBirthTime?: boolean;
      astrologyReadingTypes?: string[];
      houseSystem?: string;
    };
  };
  questionnaireResponses?: Array<{
    questionId: string;
    question: string;
    answer: string;
  }>;
  deliverables?: {
    files: Array<{
      id: string;
      name: string;
      type: string;
      url: string;
      uploadedAt: string;
    }>;
    message?: string;
    deliveredAt?: string;
  };
}

interface FulfillmentDialogProps {
  order: ServiceOrder;
  merchantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type WizardStep = 'review' | 'upload' | 'message' | 'confirm';

const STEPS: WizardStep[] = ['review', 'upload', 'message', 'confirm'];

const FulfillmentDialog: React.FC<FulfillmentDialogProps> = ({
  order,
  merchantId,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('review');
  const [uploadedFiles, setUploadedFiles] = useState<media_type[]>([]);
  const [practitionerMessage, setPractitionerMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uploadMutation = useUploadDeliverable();
  const markDeliveredMutation = useMarkDelivered();

  // Check if this is an astrology reading
  const isAstrologyReading = order.service.readingOptions?.readingType === 'Astrology';

  // Always fetch customer data (for name + birth chart for astrology readings)
  const customerDataQuery = useCustomerBirthChart(order.customerId, open);
  const customerData = customerDataQuery.data;
  const customerName = customerData?.user
    ? `${customerData.user.firstname || ''} ${customerData.user.lastname || ''}`.trim() || customerData.user.email
    : null;

  // Debug logging for tests
  if (open) {
    console.log('[FulfillmentDialog] order.service:', order.service);
    console.log('[FulfillmentDialog] order.service.readingOptions:', order.service.readingOptions);
    console.log('[FulfillmentDialog] isAstrologyReading:', isAstrologyReading);
    console.log('[FulfillmentDialog] customerData:', customerData);
  }

  const currentStepIndex = STEPS.indexOf(currentStep);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'READING':
        return <Sparkles className="h-5 w-5 text-purple-400" />;
      case 'HEALING':
        return <Heart className="h-5 w-5 text-green-400" />;
      case 'COACHING':
        return <MessageCircle className="h-5 w-5 text-blue-400" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'READING':
        return 'bg-purple-900/30 text-purple-400 border-purple-700';
      case 'HEALING':
        return 'bg-green-900/30 text-green-400 border-green-700';
      case 'COACHING':
        return 'bg-blue-900/30 text-blue-400 border-blue-700';
      default:
        return 'bg-slate-800 text-slate-400';
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

  const canProceed = () => {
    switch (currentStep) {
      case 'review':
        return true;
      case 'upload':
        return uploadedFiles.length > 0;
      case 'message':
        return true; // Message is optional
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handleFilesUploaded = (files: media_type[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('No files uploaded', {
        description: 'Please upload at least one file to deliver'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create deliverable records
      const fileMetadata = uploadedFiles.map(file => ({
        name: file.name,
        type: file.type,
        mimeType: file.type === 'VIDEO' ? 'video/mp4' :
                  file.type === 'AUDIO' ? 'audio/mpeg' :
                  file.type === 'IMAGE' ? 'image/jpeg' : 'application/octet-stream',
        size: file.sizeBytes || 0,
        url: file.url
      }));

      await uploadMutation.mutateAsync({
        vendorId: merchantId,
        orderId: order.id,
        files: fileMetadata,
        message: practitionerMessage || undefined
      });

      // Mark as delivered
      await markDeliveredMutation.mutateAsync({
        vendorId: merchantId,
        orderId: order.id
      });

      toast.success('Order delivered!', {
        description: 'The customer has been notified'
      });

      onSuccess();
      onOpenChange(false);

      // Reset state
      setCurrentStep('review');
      setUploadedFiles([]);
      setPractitionerMessage('');
    } catch (error) {
      toast.error('Failed to deliver order', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dueDate = order.service.turnaroundDays
    ? new Date(new Date(order.purchaseDate).getTime() + order.service.turnaroundDays * 24 * 60 * 60 * 1000)
    : null;
  const isOverdue = dueDate && new Date() > dueDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full md:max-w-2xl lg:max-w-3xl xl:max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700" data-testid="fulfillment-dialog">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {getCategoryIcon(order.service.category)}
            Fulfill Order
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  index < currentStepIndex
                    ? "bg-green-600 text-white"
                    : index === currentStepIndex
                    ? "bg-purple-600 text-white"
                    : "bg-slate-700 text-slate-400"
                )}
              >
                {index < currentStepIndex ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className={cn(
                "ml-2 text-sm hidden sm:inline",
                index === currentStepIndex ? "text-white" : "text-slate-500"
              )}>
                {step === 'review' ? 'Review' :
                 step === 'upload' ? 'Upload' :
                 step === 'message' ? 'Message' : 'Confirm'}
              </span>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 sm:w-16 h-0.5 mx-2",
                  index < currentStepIndex ? "bg-green-600" : "bg-slate-700"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Persistent Birth Chart Summary for Astrology Readings */}
        {isAstrologyReading && customerData?.birthChart && currentStep !== 'review' && (
          <div className="mb-4 p-3 rounded-lg bg-purple-900/20 border border-purple-700/50" data-testid="birth-chart-summary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-purple-300 font-medium flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {customerName || 'Client'}
                </span>
                <span className="text-slate-400">
                  {format(new Date(customerData.birthChart.birthDate), 'MMM d, yyyy')}
                </span>
                <span className="text-slate-400">
                  {customerData.birthChart.birthLocation.city}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-purple-900/50 text-yellow-400 capitalize">
                  ☉ {customerData.birthChart.sunSign}
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-900/50 text-blue-300 capitalize">
                  ☽ {customerData.birthChart.moonSign}
                </span>
                {customerData.birthChart.risingSign && (
                  <span className="px-2 py-0.5 rounded bg-purple-900/50 text-orange-400 capitalize">
                    ↑ {customerData.birthChart.risingSign}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[300px]">
          {/* Step 1: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4" data-testid="step-review">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={getCategoryColor(order.service.category)}>
                    {order.service.category}
                  </Badge>
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    {order.orderStatus}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{order.service.name}</h3>

                <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {customerName || `Customer #${order.customerId.slice(0, 8)}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(order.purchaseDate), 'MMM d, yyyy')}
                  </span>
                  {dueDate && (
                    <span className={cn(
                      "flex items-center gap-1",
                      isOverdue ? "text-red-400 font-medium" : ""
                    )}>
                      <Package className="h-4 w-4" />
                      Due {format(dueDate, 'MMM d')} {isOverdue && '(Overdue!)'}
                    </span>
                  )}
                </div>
              </div>

              {/* Birth Chart Section for Astrology Readings */}
              {isAstrologyReading && (
                <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-700/50" data-testid="customer-birth-chart">
                  <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Client&apos;s Birth Chart
                  </h4>
                  {customerDataQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading birth chart...
                    </div>
                  ) : customerData?.birthChart ? (
                    <div className="space-y-3">
                      {/* Birth Details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-slate-500 mt-0.5" />
                          <div>
                            <p className="text-slate-400 text-xs">Birth Date</p>
                            <p className="text-white">
                              {format(new Date(customerData.birthChart.birthDate), 'MMMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        {customerData.birthChart.birthTime && (
                          <div className="flex items-start gap-2">
                            <Clock className="h-4 w-4 text-slate-500 mt-0.5" />
                            <div>
                              <p className="text-slate-400 text-xs">Birth Time</p>
                              <p className="text-white">
                                {customerData.birthChart.birthTime}
                                {customerData.birthChart.birthTimePrecision === 'approximate' && (
                                  <span className="text-slate-500 text-xs ml-1">(approx)</span>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-2 col-span-2">
                          <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
                          <div>
                            <p className="text-slate-400 text-xs">Birth Location</p>
                            <p className="text-white">
                              {customerData.birthChart.birthLocation.city}, {customerData.birthChart.birthLocation.country}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Sun/Moon/Rising Signs */}
                      <Separator className="bg-purple-700/30" />
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded bg-purple-900/30">
                          <p className="text-xs text-slate-400">Sun</p>
                          <p className="text-sm font-medium text-yellow-400 capitalize">
                            {customerData.birthChart.sunSign}
                          </p>
                        </div>
                        <div className="p-2 rounded bg-purple-900/30">
                          <p className="text-xs text-slate-400">Moon</p>
                          <p className="text-sm font-medium text-blue-300 capitalize">
                            {customerData.birthChart.moonSign}
                          </p>
                        </div>
                        {customerData.birthChart.risingSign && (
                          <div className="p-2 rounded bg-purple-900/30">
                            <p className="text-xs text-slate-400">Rising</p>
                            <p className="text-sm font-medium text-orange-400 capitalize">
                              {customerData.birthChart.risingSign}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 p-3 rounded bg-slate-800/50 border border-slate-700">
                      <p>No birth chart found for this customer.</p>
                      <p className="text-xs mt-1 text-slate-500">
                        The customer may need to set up their birth chart in their Personal Space.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {order.questionnaireResponses && order.questionnaireResponses.length > 0 && (
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <h4 className="text-sm font-medium text-slate-200 mb-3">Client Responses</h4>
                  <div className="space-y-3">
                    {order.questionnaireResponses.map((response, idx) => (
                      <div key={idx}>
                        <p className="text-sm font-medium text-slate-400">{response.question}</p>
                        <p className="text-sm text-white">{response.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Upload */}
          {currentStep === 'upload' && (
            <div className="space-y-4" data-testid="step-upload">
              <Label className="text-slate-200 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Deliverables <span className="text-red-400">*</span>
              </Label>
              <p className="text-sm text-slate-500">
                Upload your reading, healing report, session recording, or other deliverables
              </p>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                <FileUploader
                  id={`deliverables-${order.id}`}
                  className="h-48 w-full"
                  imageClassName="rounded-lg"
                  connection={{
                    container: 'public',
                    relative_path: `service-deliverables/${merchantId}/${order.id}`
                  }}
                  acceptOnly={{ types: ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'] }}
                  allowMultiple={true}
                  value={null}
                  onDropAsync={() => {}}
                  onUploadCompleteAsync={handleFilesUploaded}
                  onRemoveAsync={() => {}}
                  includePreview={false}
                />
              </div>
              <p className="text-xs text-slate-500">
                Supported: Images, videos, audio, PDF, and Office documents
              </p>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-200">Uploaded Files:</p>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="text-sm font-medium text-white">{file.name}</p>
                          {file.sizeBytes && (
                            <p className="text-xs text-slate-500">
                              {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Message */}
          {currentStep === 'message' && (
            <div className="space-y-4" data-testid="step-message">
              <Label className="text-slate-200">
                Message for Client <span className="text-slate-500">(optional)</span>
              </Label>
              <p className="text-sm text-slate-500">
                Share any insights, guidance, or instructions for your client
              </p>
              <Textarea
                value={practitionerMessage}
                onChange={(e) => setPractitionerMessage(e.target.value)}
                placeholder="Add any notes, interpretations, or guidance for your client..."
                className="bg-slate-800/50 border-slate-700 text-white min-h-[200px]"
                data-testid="practitioner-message-input"
              />
            </div>
          )}

          {/* Step 4: Confirm */}
          {currentStep === 'confirm' && (
            <div className="space-y-4" data-testid="step-confirm">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-900/30 flex items-center justify-center">
                  <Send className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Ready to Deliver</h3>
                <p className="text-slate-400">Review your delivery details below</p>
              </div>

              <Separator className="bg-slate-700" />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Service:</span>
                  <span className="text-white">{order.service.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Files:</span>
                  <span className="text-white">{uploadedFiles.length} file(s)</span>
                </div>
                {practitionerMessage && (
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400">Message:</span>
                    <span className="text-white text-right max-w-[60%] truncate">
                      {practitionerMessage.slice(0, 50)}...
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-green-900/20 border border-green-800 text-sm text-green-400">
                The customer will be notified that their order is ready.
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={currentStepIndex === 0 ? () => onOpenChange(false) : goBack}
            className="border-slate-600 text-slate-300"
            disabled={isSubmitting}
          >
            {currentStepIndex === 0 ? (
              'Cancel'
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </>
            )}
          </Button>

          {currentStep === 'confirm' ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="confirm-delivery-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Delivering...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Deliver to Customer
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canProceed()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="next-step-button"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FulfillmentDialog;
