import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactDto } from './contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(200)
  async submit(@Body() dto: ContactDto) {
    await this.contactService.sendContactForm(dto);
    return { success: true };
  }
}
