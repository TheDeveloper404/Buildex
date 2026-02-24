import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { RequestContext } from '../common/request-context';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { context: RequestContext }>();
    
    if (!request.context.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    
    return true;
  }
}
