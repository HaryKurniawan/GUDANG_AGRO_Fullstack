import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    peran: string;
    gudangId?: string;
  };
}

/**
 * Middleware to check if user has required role
 * @param allowedRoles Array of allowed roles
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Unauthorized: User not authenticated',
      });
    }

    const userRole = req.user.peran;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        statusCode: 403,
        message: `Forbidden: Role ${userRole} tidak memiliki akses. Diperlukan role: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Alias for requireRole (for backward compatibility)
 */
export const roleGuard = requireRole;

/**
 * Middleware to check if user is Admin (ADMIN_GUDANG or SUPER_ADMIN)
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  return requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN'])(req, res, next);
};

/**
 * Middleware to check if user is Staf Gudang or higher
 */
export const requireStaf = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  return requireRole(['STAF_GUDANG', 'ADMIN_GUDANG', 'SUPER_ADMIN'])(req, res, next);
};
