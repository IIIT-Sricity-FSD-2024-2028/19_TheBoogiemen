import { Controller, Get, Post, Body } from '@nestjs/common';
import { StateService } from './state.service';

@Controller('state')
export class StateController {
  constructor(private readonly stateService: StateService) {}

  @Get()
  getState() {
    return this.stateService.getState();
  }

  @Post()
  setState(@Body() body: any) {
    return this.stateService.setState(body);
  }
}
