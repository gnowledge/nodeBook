import { Injectable } from '@nestjs/common';
import ScientificLibraryManager from '../../scientific-library-manager.js';

@Injectable()
export class ScientificService {
  private scientificManager: any;

  constructor() {
    this.scientificManager = new ScientificLibraryManager();
  }

  async getLibraries() {
    return this.scientificManager.getAvailableLibraries();
  }

  async getLibraryInfo(library: string) {
    const info = this.scientificManager.getLibraryInfo(library);
    if (!info) {
      throw new Error('Library not found');
    }
    return info;
  }

  async getFunctions(library?: string, category?: string, search?: string) {
    if (library) {
      return this.scientificManager.getFunctionsByLibrary(library);
    } else if (category) {
      return this.scientificManager.getFunctionsByCategory(category);
    } else if (search) {
      return this.scientificManager.searchFunctions(search);
    } else {
      return this.scientificManager.getAllFunctions();
    }
  }

  async getFunctionInfo(library: string, name: string) {
    const info = this.scientificManager.getFunctionInfo(library, name);
    if (!info) {
      throw new Error('Function not found');
    }
    return info;
  }

  async validateExpression(expression: string) {
    return this.scientificManager.validateExpression(expression);
  }

  async evaluateExpression(expression: string, scope: any = {}) {
    try {
      const result = this.scientificManager.executeExpression(expression, scope);
      return { result, expression, scope };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

