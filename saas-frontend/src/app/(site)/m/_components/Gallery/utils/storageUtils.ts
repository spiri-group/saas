// Storage limits and guardrails for gallery uploads

export interface StorageLimits {
  totalStorageGB: number;
  maxPhotoSizeMB: number;
  maxVideoSizeGB: number;
  maxItemsPerAlbum?: number; // Optional recommendation, not enforced
}

export interface MerchantPlan {
  name: string;
  limits: StorageLimits;
}

// Plan definitions
export const MERCHANT_PLANS: Record<string, MerchantPlan> = {
  base: {
    name: 'Merchant (Base)',
    limits: {
      totalStorageGB: 3,
      maxPhotoSizeMB: 20,
      maxVideoSizeGB: 1,
      maxItemsPerAlbum: 400,
    }
  },
  premium: {
    name: 'Merchant Premium',
    limits: {
      totalStorageGB: 50,
      maxPhotoSizeMB: 20,
      maxVideoSizeGB: 1,
      maxItemsPerAlbum: 400,
    }
  }
};

export interface StorageUsage {
  usedGB: number;
  totalGB: number;
  usedPercentage: number;
  remainingGB: number;
}

export const calculateStorageUsage = (
  usedBytes: number, 
  totalGB: number
): StorageUsage => {
  const usedGB = usedBytes / (1024 * 1024 * 1024);
  const usedPercentage = Math.min((usedGB / totalGB) * 100, 100);
  const remainingGB = Math.max(totalGB - usedGB, 0);

  return {
    usedGB: Number(usedGB.toFixed(2)),
    totalGB,
    usedPercentage: Number(usedPercentage.toFixed(1)),
    remainingGB: Number(remainingGB.toFixed(2))
  };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export const validateFileSize = (
  file: File, 
  limits: StorageLimits
): { valid: boolean; error?: string } => {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  
  if (isVideo) {
    const maxSizeBytes = limits.maxVideoSizeGB * 1024 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `Video size exceeds ${limits.maxVideoSizeGB}GB limit. Current size: ${formatFileSize(file.size)}`
      };
    }
  } else if (isImage) {
    const maxSizeBytes = limits.maxPhotoSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `Image size exceeds ${limits.maxPhotoSizeMB}MB limit. Current size: ${formatFileSize(file.size)}`
      };
    }
  }
  
  return { valid: true };
};

export const validateStorageCapacity = (
  files: File[],
  currentUsageBytes: number,
  limits: StorageLimits
): { valid: boolean; error?: string } => {
  const totalNewBytes = files.reduce((sum, file) => sum + file.size, 0);
  const totalAfterUpload = currentUsageBytes + totalNewBytes;
  const maxBytes = limits.totalStorageGB * 1024 * 1024 * 1024;
  
  if (totalAfterUpload > maxBytes) {
    const excessBytes = totalAfterUpload - maxBytes;
    return {
      valid: false,
      error: `Upload would exceed storage limit by ${formatFileSize(excessBytes)}. Current usage: ${formatFileSize(currentUsageBytes)}, Available: ${formatFileSize(maxBytes - currentUsageBytes)}`
    };
  }
  
  return { valid: true };
};

export const getStorageWarningLevel = (usedPercentage: number): 'none' | 'warning' | 'critical' => {
  if (usedPercentage >= 95) return 'critical';
  if (usedPercentage >= 80) return 'warning';
  return 'none';
};

export const getStorageWarningColor = (level: 'none' | 'warning' | 'critical'): string => {
  switch (level) {
    case 'critical': return 'text-red-600';
    case 'warning': return 'text-yellow-600';
    default: return 'text-green-600';
  }
};