import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { RequestContext } from '../common/request-context';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request & { context: RequestContext }, res: Response, next: NextFunction) {
    req.context = {};

    const sessionId = req.cookies?.['session_id'];
    
    if (sessionId) {
      const session = await this.authService.findSessionById(sessionId);
      
      if (session) {
        req.context.sessionId = session.id;
        req.context.userId = session.userId;
        req.context.tenantId = session.tenantId;
        
        // Update last seen (async, don't block)
        this.authService.updateSessionLastSeen(session.id).catch(() => {});
      }
    }

    next();
  }
}
