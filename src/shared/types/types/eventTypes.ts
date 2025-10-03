// Event Type related types for Better Now application
// Based on technical architecture documentation

import { BaseEntity } from './core';

export interface EventType extends BaseEntity {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  active: boolean;
}