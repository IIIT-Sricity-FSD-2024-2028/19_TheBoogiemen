import { Injectable } from '@nestjs/common';

@Injectable()
export class StateService {
  private globalState: any = null;

  getState(): any {
    return this.globalState || {};
  }

  setState(state: any): any {
    this.globalState = state;
    return this.globalState;
  }
}
