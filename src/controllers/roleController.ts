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
import * as RoleService from '../services/roleService';
import { RoleRequest, RoleResponse } from '../types/schema/Role';

@Route('roles')
@Tags('Role')
export class RoleController extends Controller {
  /** Retrieve all available roles */
  @Get('/')
  public async getRoles(): Promise<RoleResponse[]> {
    return RoleService.getAllRoles();
  }

  /** Fetch a specific role by ID */
  @Get('{id}')
  public async getRole(@Path() id: string): Promise<RoleResponse | null> {
    return RoleService.getRoleById(id);
  }

  /** Create a new role */
  @Post('/')
  public async createRole(@Body() body: RoleRequest): Promise<RoleResponse> {
    return RoleService.createRole(body);
  }

  /** Update an existing role by ID */
  @Put('{id}')
  public async updateRole(
    @Path() id: string,
    @Body() body: RoleRequest
  ): Promise<RoleResponse | null> {
    return RoleService.updateRole(id, body);
  }

  /** Delete a role by ID */
  @Delete('{id}')
  public async deleteRole(@Path() id: string): Promise<{ success: boolean }> {
    await RoleService.deleteRole(id);
    return { success: true };
  }
}
