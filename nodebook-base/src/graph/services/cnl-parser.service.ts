import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cnlParser from '../../../cnl-parser.js';

@Injectable()
export class CNLParserService {
  constructor(private configService: ConfigService) {}

  async diffCnl(newCnl: string, oldCnl: string) {
    return cnlParser.diffCnl(newCnl, oldCnl);
  }

  async getNodeOrderFromCnl(cnlText: string) {
    return cnlParser.getNodeOrderFromCnl(cnlText);
  }

  async getOperationsFromCnl(cnlText: string, mode: string) {
    return cnlParser.getOperationsFromCnl(cnlText, mode);
  }

  async validateOperations(operations: any[]) {
    return cnlParser.validateOperations(operations);
  }
}

