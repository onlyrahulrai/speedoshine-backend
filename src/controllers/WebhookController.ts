import {
    Controller,
    Post,
    Route,
    Tags,
    Request,
} from "tsoa";

import * as WebhookService from "../services/webhookService";

@Route("webhooks")
@Tags("Webhooks")
export class WebhookController extends Controller {
    @Post("/razorpay")
    public async razorpay(
        @Request() req: any
    ): Promise<any> {
        return await WebhookService.razorpay(req);
    }
}