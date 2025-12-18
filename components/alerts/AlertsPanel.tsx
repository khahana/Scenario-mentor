'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  XCircle,
  Trash2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useAlertsStore } from '@/lib/stores';
import { cn, timeAgo } from '@/lib/utils/helpers';

interface AlertsPanelProps {
  onClose: () => void;
}

export function AlertsPanel({ onClose }: AlertsPanelProps) {
  const { alerts, markAsRead, markAllAsRead, removeAlert, clearAlerts } = useAlertsStore();
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const unreadCount = alerts.filter(a => !a.read).length;

  // Play sound on new alert
  useEffect(() => {
    if (soundEnabled && unreadCount > 0) {
      // Browser notification sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleApBmdTVnWwUEkqT0tCVYw8eTIvQz45bCyNQic3OiVYIJ1OHy82GUgYpVYXKzINQBS1Xg8nLgE4DL1mByMt+TAMwW3/Hy3tKAjJdfMbKd0gCNF56xch1RgE2YHjFx3NDADdhdsTGcEEAOWN0wsVuPwA6ZnLBxGw9ADtocsDDbDsAPGpvv8NqOQA9a26+wmk3AD5tbbyBaDYAP25ru4FnNQBAbmm6gGY0AEBvZ7l/ZTMAQXBluH9kMgBBcWO3fmMxAEJyYrZ+YjAAQnNgt31hLwBDdF62fGAuAEN1XLV8XywARHZatHteLABEd1mze10rAER4V7J6XCoARXlVsXlbKQBFelOweVooBo');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
    }
  }, [unreadCount, soundEnabled]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'danger': return <XCircle className="w-5 h-5 text-danger" />;
      default: return <Info className="w-5 h-5 text-info" />;
    }
  };

  const getAlertBg = (type: string, read: boolean) => {
    if (read) return 'bg-background-tertiary/50';
    switch (type) {
      case 'success': return 'bg-success/10 border-success/30';
      case 'warning': return 'bg-warning/10 border-warning/30';
      case 'danger': return 'bg-danger/10 border-danger/30';
      default: return 'bg-info/10 border-info/30';
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="fixed right-4 top-20 w-96 max-h-[80vh] bg-background-secondary border border-border rounded-2xl shadow-2xl z-50 flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            <h2 className="font-semibold text-foreground">Alerts</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-danger text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-foreground-muted" />
              ) : (
                <VolumeX className="w-4 h-4 text-foreground-muted" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-foreground-muted" />
            </button>
          </div>
        </div>

        {/* Actions */}
        {alerts.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <button
              onClick={markAllAsRead}
              className="text-sm text-accent hover:text-accent/80 transition-colors"
            >
              Mark all read
            </button>
            <button
              onClick={clearAlerts}
              className="text-sm text-foreground-muted hover:text-danger transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear all
            </button>
          </div>
        )}

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-foreground-muted mx-auto mb-4 opacity-50" />
              <p className="text-foreground-secondary">No alerts yet</p>
              <p className="text-sm text-foreground-muted mt-1">
                Alerts will appear when price approaches your scenario triggers
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => markAsRead(alert.id)}
                  className={cn(
                    'p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]',
                    getAlertBg(alert.type, alert.read),
                    !alert.read && 'border-l-4'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm',
                        alert.read ? 'text-foreground-secondary' : 'text-foreground font-medium'
                      )}>
                        {alert.title}
                      </p>
                      <p className="text-xs text-foreground-muted mt-1">
                        {alert.message}
                      </p>
                      <p className="text-xs text-foreground-muted mt-2">
                        {timeAgo(new Date(alert.timestamp))}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAlert(alert.id);
                      }}
                      className="p-1 hover:bg-background-elevated rounded transition-colors"
                    >
                      <X className="w-3 h-3 text-foreground-muted" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
