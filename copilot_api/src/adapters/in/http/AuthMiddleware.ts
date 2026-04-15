import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        managerId: string;
        role: string;
      };
    }
  }
}

export class AuthMiddleware {
  public static requireManagerRole(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (token === 'token-gerente-silva') {
      req.user = { managerId: '3', role: 'PORTFOLIO_MANAGER' };
      next();
    } else if (token === 'token-admin') {
      req.user = { managerId: 'ADMIN', role: 'ADMIN' };
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Invalid token credentials' });
    }
  }
}