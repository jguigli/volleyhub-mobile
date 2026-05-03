import { apiClient } from './client';

export type ReportTargetType = 'user' | 'chat_message';
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'impersonation'
  | 'other';

export const reportsApi = {
  report: async (
    targetType: ReportTargetType,
    targetId: string,
    reason: ReportReason,
    details?: string,
  ): Promise<void> => {
    await apiClient.post('/reports', { targetType, targetId, reason, details });
  },
};
