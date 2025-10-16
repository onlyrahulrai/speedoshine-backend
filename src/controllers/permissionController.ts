import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Route,
  Tags,
  Path,
  Body
} from 'tsoa';
import * as permissionService from '../services/permissionService';
import { PermissionRequest, PermissionResponse } from '../types/schema/Permission';

@Route('permissions')       
@Tags('Permission')         
export class PermissionController extends Controller {   
  @Get('/')
  public async getPermissions(): Promise<PermissionResponse[]> {
    return permissionService.getAllPermissions();
  }

  @Get('{id}')
  public async getPermission(@Path() id?: string): Promise<PermissionResponse | null> {
    return permissionService.getPermissionById(id);
  }

  @Post('/')
  public async createPermission(@Body() body: PermissionRequest): Promise<PermissionResponse> {
    return permissionService.createPermission(body);
  }

  @Put('{id}')
  public async updatePermission(
    @Path() id: string,
    @Body() body: PermissionRequest
  ): Promise<PermissionResponse | null> {
    return permissionService.updatePermission(id, body);
  }

  @Delete('{id}')
  public async deletePermission(@Path() id: string): Promise<{ success: boolean }> {
    await permissionService.deletePermission(id);
    return { success: true };
  }
}
