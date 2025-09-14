import { Injectable } from '@nestjs/common';

// Import the existing cnl-parser.js module
const { 
  diffCnl, 
  getNodeOrderFromCnl, 
  getOperationsFromCnl, 
  validateOperations 
} = require('../../../../cnl-parser.js');

@Injectable()
export class CNLParserService {
  diffCnl(newCnl: string, oldCnl: string) {
    return diffCnl(newCnl, oldCnl);
  }

  getNodeOrderFromCnl(cnlText: string) {
    return getNodeOrderFromCnl(cnlText);
  }

  getOperationsFromCnl(cnlText: string, mode: string) {
    return getOperationsFromCnl(cnlText, mode);
  }

  async validateOperations(operations: any[]) {
    return validateOperations(operations);
  }
}
