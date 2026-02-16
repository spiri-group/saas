'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileText, Clock, CheckCircle, AlertCircle, Package, Video, Music, FileImage, Sparkles } from 'lucide-react';
import UseServiceOrder from './UseServiceOrder';
import CDNImage from '@/components/ux/CDNImage';

type Props = {
    orderId: string;
    userId: string;
};

const ServiceOrderDetail: React.FC<Props> = ({ orderId }) => {
    const { data: order, isLoading } = UseServiceOrder(orderId);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                <p className="text-slate-400 mt-3 text-sm">Loading details...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-400">Order not found</p>
            </div>
        );
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case 'IN_PROGRESS':
                return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30"><Package className="w-3 h-3 mr-1" />In Progress</Badge>;
            case 'DELIVERED':
                return <Badge className="bg-green-500/20 text-green-300 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Delivered</Badge>;
            default:
                return <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30"><AlertCircle className="w-3 h-3 mr-1" />{status}</Badge>;
        }
    };

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case 'READING':
                return <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30">Reading</Badge>;
            case 'HEALING':
                return <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-500/30">Healing</Badge>;
            case 'COACHING':
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">Coaching</Badge>;
            default:
                return <Badge variant="outline">{category}</Badge>;
        }
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('video/')) return <Video className="w-4 h-4 text-blue-400" />;
        if (mimeType.startsWith('audio/')) return <Music className="w-4 h-4 text-purple-400" />;
        if (mimeType.startsWith('image/')) return <FileImage className="w-4 h-4 text-green-400" />;
        return <FileText className="w-4 h-4 text-slate-400" />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div data-testid={`service-order-detail-${orderId}`}>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    {order.service.name}
                </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
                {/* Header info */}
                <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(order.status)}
                    {getCategoryBadge(order.service.category)}
                    <span className="text-xs text-slate-500">
                        From <span className="text-slate-300">{order.service.vendor.name}</span>
                    </span>
                </div>

                {/* Thumbnail */}
                {order.service.thumbnail && (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden">
                        <CDNImage
                            src={order.service.thumbnail.image.media.url}
                            alt={order.service.name}
                            width={600}
                            height={160}
                            className="object-cover w-full h-full rounded-lg"
                        />
                    </div>
                )}

                {/* Description */}
                {order.service.description && (
                    <div>
                        <h4 className="text-sm font-medium text-white mb-1">About</h4>
                        <p className="text-sm text-slate-400 whitespace-pre-line">{order.service.description}</p>
                    </div>
                )}

                <Separator className="bg-white/10" />

                {/* Status timeline */}
                <div>
                    <h4 className="text-sm font-medium text-white mb-3">Progress</h4>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs text-slate-400">Ordered</span>
                        </div>
                        <div className="flex-grow h-px bg-white/10" />
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${order.status === 'IN_PROGRESS' || order.status === 'DELIVERED' ? 'bg-green-500' : 'bg-slate-600'}`} />
                            <span className="text-xs text-slate-400">In Progress</span>
                        </div>
                        <div className="flex-grow h-px bg-white/10" />
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${order.status === 'DELIVERED' ? 'bg-green-500' : 'bg-slate-600'}`} />
                            <span className="text-xs text-slate-400">Delivered</span>
                        </div>
                    </div>
                </div>

                {/* Questionnaire responses */}
                {order.questionnaireResponses && order.questionnaireResponses.length > 0 && (
                    <>
                        <Separator className="bg-white/10" />
                        <div>
                            <h4 className="text-sm font-medium text-white mb-2">Your Responses</h4>
                            <div className="space-y-2">
                                {order.questionnaireResponses.map((response) => (
                                    <div key={response.questionId} className="bg-white/5 rounded-lg p-3">
                                        <p className="text-xs text-slate-400 mb-1">{response.question}</p>
                                        <p className="text-sm text-slate-200">{response.answer}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Deliverables */}
                {order.status === 'DELIVERED' && order.deliverables && (
                    <>
                        <Separator className="bg-white/10" />
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <h4 className="text-sm font-medium text-white">Your Delivery</h4>
                            </div>

                            {order.deliverables.message && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-3">
                                    <p className="text-xs text-green-300/70 mb-1">Message from your practitioner</p>
                                    <p className="text-sm text-slate-200 whitespace-pre-line">{order.deliverables.message}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                {order.deliverables.files.map((file) => (
                                    <div key={file.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/10">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {getFileIcon(file.mimeType)}
                                            <div className="min-w-0">
                                                <p className="text-sm text-white truncate">{file.name}</p>
                                                <p className="text-[10px] text-slate-500">{formatFileSize(file.size)}</p>
                                            </div>
                                        </div>
                                        {file.signedUrl && (
                                            <Button size="sm" variant="ghost" className="text-purple-300 hover:text-purple-200 shrink-0" asChild>
                                                <a href={file.signedUrl} download target="_blank" rel="noopener noreferrer">
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Order details */}
                <Separator className="bg-white/10" />
                <div className="flex justify-between text-xs text-slate-500">
                    <span>Order {order.id.slice(0, 8)}</span>
                    <span>{new Date(order.purchaseDate).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
};

export default ServiceOrderDetail;
