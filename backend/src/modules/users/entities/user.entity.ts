import { User as PrismaUser } from '@prisma/client';

export type User = PrismaUser;

export type UserWithoutPassword = Omit<User, 'passwordHash'>;

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
}
