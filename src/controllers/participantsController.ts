import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Route,
  Tags,
  Path,
  Body,
  Query,
} from "tsoa";
import * as ParticipantsService from "../services/participantsService";
import { ParticipantResponse } from "../types/schema/Participant";

@Route("participants")
@Tags("Participant")
export class ParticipantController extends Controller {
  @Get("/")
  public async getParticipants(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() search?: string
  ): Promise<ParticipantResponse[]> {
    return ParticipantsService.getAllParticipants({
      page,
      limit,
      search,
    });
  }
}
