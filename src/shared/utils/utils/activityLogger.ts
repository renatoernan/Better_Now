interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  user: string;
  category: 'auth' | 'contact' | 'image' | 'backup' | 'system' | 'export';
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, any>;
}

class ActivityLogger {
  private static readonly STORAGE_KEY = 'admin_activity_logs';
  private static readonly MAX_LOGS = 1000;

  static log(action: string, details: string, category: ActivityLog['category'], severity: ActivityLog['severity'] = 'info', metadata?: Record<string, any>): void {
    const log: ActivityLog = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      action,
      details,
      user: this.getCurrentUser(),
      category,
      severity,
      metadata
    };

    this.saveLogs([log, ...this.getLogs().slice(0, this.MAX_LOGS - 1)]);
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${severity.toUpperCase()}] ${category}: ${action} - ${details}`, metadata);
    }
  }

  static getLogs(filters?: {
    category?: ActivityLog['category'];
    severity?: ActivityLog['severity'];
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): ActivityLog[] {
    let logs = this.loadLogs();

    if (filters) {
      if (filters.category) {
        logs = logs.filter(log => log.category === filters.category);
      }
      if (filters.severity) {
        logs = logs.filter(log => log.severity === filters.severity);
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
      if (filters.limit) {
        logs = logs.slice(0, filters.limit);
      }
    }

    return logs;
  }

  static getRecentActivities(limit: number = 50): ActivityLog[] {
    return this.getLogs({ limit });
  }

  static getLogStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    todayCount: number;
    weekCount: number;
  } {
    const logs = this.loadLogs();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let todayCount = 0;
    let weekCount = 0;

    logs.forEach(log => {
      // Count by category
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
      
      // Count by severity
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
      
      // Count today and week
      const logDate = new Date(log.timestamp);
      if (logDate >= today) {
        todayCount++;
      }
      if (logDate >= weekAgo) {
        weekCount++;
      }
    });

    return {
      total: logs.length,
      byCategory,
      bySeverity,
      todayCount,
      weekCount
    };
  }

  static clearLogs(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.log('clear_logs', 'Todos os logs foram limpos', 'system', 'warning');
  }

  static exportLogs(format: 'json' | 'csv' = 'json'): void {
    const logs = this.loadLogs();
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'json') {
      const dataStr = JSON.stringify(logs, null, 2);
      this.downloadFile(dataStr, `activity-logs-${timestamp}.json`, 'application/json');
    } else if (format === 'csv') {
      const csvContent = this.convertToCSV(logs);
      this.downloadFile(csvContent, `activity-logs-${timestamp}.csv`, 'text/csv');
    }
    
    this.log('export_logs', `Logs exportados em formato ${format.toUpperCase()}`, 'export', 'info', { format, count: logs.length });
  }

  private static loadLogs(): ActivityLog[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading activity logs:', error);
      return [];
    }
  }

  private static saveLogs(logs: ActivityLog[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Error saving activity logs:', error);
    }
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static getCurrentUser(): string {
    // Try to get user from auth context or localStorage
    const authData = localStorage.getItem('auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed.user?.email || 'admin';
      } catch {
        return 'admin';
      }
    }
    return 'admin';
  }

  private static convertToCSV(logs: ActivityLog[]): string {
    const headers = ['ID', 'Timestamp', 'Action', 'Details', 'User', 'Category', 'Severity'];
    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      log.action,
      log.details,
      log.user,
      log.category,
      log.severity
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Convenience methods for common log types
  static logAuth(action: string, details: string, severity: ActivityLog['severity'] = 'info', metadata?: Record<string, any>): void {
    this.log(action, details, 'auth', severity, metadata);
  }

  static logContact(action: string, details: string, severity: ActivityLog['severity'] = 'info', metadata?: Record<string, any>): void {
    this.log(action, details, 'contact', severity, metadata);
  }

  static logImage(action: string, details: string, severity: ActivityLog['severity'] = 'info', metadata?: Record<string, any>): void {
    this.log(action, details, 'image', severity, metadata);
  }

  static logBackup(action: string, details: string, severity: ActivityLog['severity'] = 'info', metadata?: Record<string, any>): void {
    this.log(action, details, 'backup', severity, metadata);
  }

  static logSystem(action: string, details: string, severity: ActivityLog['severity'] = 'info', metadata?: Record<string, any>): void {
    this.log(action, details, 'system', severity, metadata);
  }

  static logExport(action: string, details: string, severity: ActivityLog['severity'] = 'info', metadata?: Record<string, any>): void {
    this.log(action, details, 'export', severity, metadata);
  }
}

export { ActivityLogger };
export default ActivityLogger;
export type { ActivityLog };