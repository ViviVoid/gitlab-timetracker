import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface GitLabTimeEntry {
  author: string;
  spentHours: number;
  spentAt: Date;
  commentSummary?: string;
  isNegative: boolean;
  issueIid: string;
  issueTitle: string;
}

export interface GitLabIssue {
  iid: number;
  title: string;
  web_url: string;
  created_at: string;
  updated_at: string;
}

export interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
