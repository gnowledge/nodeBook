import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataStoreService } from './services/data-store.service';
import { GraphManagerService } from './services/graph-manager.service';
import { CNLParserService } from './services/cnl-parser.service';
import { CNLSuggestionService } from './services/cnl-suggestion.service';
import { CreateGraphDto, UpdateGraphModeDto, UpdateGraphPreviewDto, UpdateGraphPublicationDto, ProcessCNLDto, SaveCNLDto, CNLSuggestDto, CNLValidateDto } from './dto/graph.dto';

@Injectable()
export class GraphService {
  constructor(
    private dataStoreService: DataStoreService,
    private graphManagerService: GraphManagerService,
    private cnlParserService: CNLParserService,
    private cnlSuggestionService: CNLSuggestionService,
  ) {}

  async getGraphs(userId: string) {
    try {
      const graphs = await this.dataStoreService.getGraphRegistry(userId);
      // Add publication state if not present (for backward compatibility)
      const graphsWithPublicationState = graphs.map(graph => ({
        ...graph,
        publication_state: graph.publication_state || 'Private',
        description: graph.description || null,
        preview_url: graph.preview_url || null,
        // Map snake_case date fields to camelCase for frontend consistency
        createdAt: graph.createdAt || graph.created_at,
        updatedAt: graph.updatedAt || graph.updated_at
      }));
      return graphsWithPublicationState;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async createGraph(userId: string, createGraphDto: CreateGraphDto) {
    const { name, author, email, mode = 'richgraph' } = createGraphDto;
    
    if (!name) {
      throw new BadRequestException('Graph name is required');
    }

    try {
      const graphId = crypto.randomUUID();
      const newGraph = {
        id: graphId,
        name,
        author,
        email,
        mode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [],
        relations: [],
        attributes: [],
        functions: []
      };
      
      // Create initial manifest
      const userInfo = { username: author || 'Unknown', email: email || 'unknown@example.com' };
      await this.dataStoreService.createManifest(userId, graphId, { name, mode }, userInfo);
      
      // Save graph data and update registry
      await this.dataStoreService.saveGraph(userId, graphId, newGraph);
      
      // Initialize version control for the new graph
      await this.dataStoreService.initializeVersionControl(userId, graphId, author || 'Unknown', email || 'unknown@example.com');
      
      await this.dataStoreService.updateGraphRegistry(userId, graphId, {
        name,
        author,
        email,
        mode,
        createdAt: newGraph.createdAt,
        updatedAt: newGraph.updatedAt
      });
      
      return newGraph;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getGraph(userId: string, graphId: string) {
    try {
      const graph = await this.dataStoreService.createGraphObject(userId, graphId);
      if (!graph) {
        throw new NotFoundException('Graph not found');
      }

      const nodes = await graph.listAll('nodes');
      const relations = await graph.listAll('relations');
      const attributes = await graph.listAll('attributes');
      
      // Filter out deleted items
      let filteredRelations = relations.filter(rel => !rel.isDeleted);
      let filteredAttributes = attributes.filter(attr => !attr.isDeleted);
      
      // Filter by active morphs using the morph registry
      const activeMorphs = new Set();
      nodes.forEach(node => {
        if (node.nbh) {
          activeMorphs.add(node.nbh);
        }
      });
      
      if (activeMorphs.size > 0) {
        // Filter relations and attributes using morph registry
        filteredRelations = this.dataStoreService.getFilteredRelations(relations, Array.from(activeMorphs));
        filteredAttributes = this.dataStoreService.getFilteredAttributes(attributes, Array.from(activeMorphs));
      }
      
      // Get the graph mode from the manifest
      const manifest = await this.dataStoreService.getManifest(userId, graphId);
      const mode = manifest?.mode || 'richgraph';
      
      return {
        nodes: nodes.filter(node => !node.isDeleted),
        relations: filteredRelations,
        attributes: filteredAttributes,
        mode: mode
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  async getCNL(userId: string, graphId: string) {
    try {
      const cnl = await this.dataStoreService.getCnl(userId, graphId);
      return { cnl };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async saveCNL(userId: string, graphId: string, saveCNLDto: SaveCNLDto) {
    try {
      await this.dataStoreService.saveCnl(userId, graphId, saveCNLDto.cnlText);
      return { message: 'CNL saved successfully.' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async processCNL(userId: string, graphId: string, processCNLDto: ProcessCNLDto) {
    try {
      const { cnlText } = processCNLDto;
      
      // Get the current CNL text and graph info to determine mode
      const currentCnl = await this.dataStoreService.getCnl(userId, graphId);
      const graphRegistry = await this.dataStoreService.getGraphRegistry(userId);
      const graphInfo = graphRegistry.find(g => g.id === graphId);
      const mode = graphInfo?.mode || 'richgraph';
      
      // StrictGraph mode: validate against schema definitions before processing
      if (mode === 'strictgraph') {
        const operations = this.cnlParserService.getOperationsFromCnl(cnlText, mode);
        const errors = await this.cnlParserService.validateOperations(operations);
        if (errors.length > 0) {
          throw new BadRequestException('Validation errors', { cause: errors });
        }
      }
      
      // Regenerate the entire graph from the new CNL
      const newGraphData = await this.dataStoreService.regenerateGraphFromCnl(userId, graphId, cnlText);
      
      // Update the manifest with new version and commit info
      const userInfo = {
        username: 'Unknown', // This should come from the authenticated user
        email: 'unknown@example.com',
        id: userId
      };
      const updatedManifest = await this.dataStoreService.updateManifest(userId, graphId, userInfo);
      
      // Save the new CNL as the source of truth
      await this.dataStoreService.saveCnl(userId, graphId, cnlText);
      
      // Update registry with latest description for Dashboard cards
      try {
        const latestGraph = await this.dataStoreService.getGraph(userId, graphId);
        const latestDescription = latestGraph?.description || null;
        await this.dataStoreService.updateGraphRegistry(userId, graphId, { description: latestDescription });
      } catch (regErr) {
        console.warn(`Failed to update registry description for graph ${graphId}:`, regErr);
      }
      
      return { message: 'CNL processed successfully.' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  async getGraphKey(userId: string, graphId: string) {
    try {
      const graph = await this.dataStoreService.createGraphObject(userId, graphId);
      if (!graph) {
        throw new NotFoundException('Graph not found');
      }
      return { key: graph.key };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  async getPublicationState(userId: string, graphId: string) {
    try {
      const graphRegistry = await this.dataStoreService.getGraphRegistry(userId);
      const graphInfo = graphRegistry.find(g => g.id === graphId);
      if (!graphInfo) {
        throw new NotFoundException('Graph not found');
      }
      return { publication_state: graphInfo.publication_state || 'Private' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  async updatePublicationState(userId: string, graphId: string, updatePublicationDto: UpdateGraphPublicationDto) {
    try {
      const updatedGraph = await this.graphManagerService.updatePublicationState(userId, graphId, updatePublicationDto.publication_state);
      return updatedGraph;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updateGraphMode(userId: string, graphId: string, updateModeDto: UpdateGraphModeDto) {
    try {
      const updatedRegistry = await this.dataStoreService.updateGraphRegistry(userId, graphId, { mode: updateModeDto.mode });
      const updated = updatedRegistry.find(g => g.id === graphId);
      return updated || { id: graphId, mode: updateModeDto.mode };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updateGraphPreview(userId: string, graphId: string, updatePreviewDto: UpdateGraphPreviewDto) {
    try {
      const updates = { preview_url: updatePreviewDto.preview_url };
      if (updatePreviewDto.node_id) {
        Object.assign(updates, { preview_node_id: updatePreviewDto.node_id });
      }
      const updated = await this.dataStoreService.updateGraphRegistry(userId, graphId, updates);
      const info = updated.find(g => g.id === graphId) || { id: graphId, preview_url: updatePreviewDto.preview_url };
      return info;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async publishGraph(userId: string, graphId: string) {
    try {
      const result = await this.graphManagerService.publishGraph(userId, graphId);
      return { message: 'Graph published successfully', publishedAt: result.publishedAt };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async exportGraph(userId: string, graphId: string, name?: string) {
    // This would return a stream for the NDF export
    // Implementation would be similar to the existing export logic
    throw new Error('Export functionality not yet implemented in NestJS version');
  }

  async importGraph(userId: string, file: any) {
    // This would handle NDF import
    // Implementation would be similar to the existing import logic
    throw new Error('Import functionality not yet implemented in NestJS version');
  }

  async deleteGraph(userId: string, graphId: string) {
    try {
      await this.dataStoreService.deleteGraph(userId, graphId);
      return { message: 'Graph deleted successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async suggestCNL(userId: string, suggestDto: CNLSuggestDto) {
    try {
      const suggestions = await this.cnlSuggestionService.generateSuggestions(suggestDto.text);
      return suggestions;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async validateCNL(userId: string, validateDto: CNLValidateDto) {
    try {
      const nlpAnalysis = await this.cnlSuggestionService.analyzeWithNLP(validateDto.cnlText);
      const qualityScore = this.cnlSuggestionService.assessQuality([], nlpAnalysis);
      const recommendations = this.cnlSuggestionService.generateRecommendations([], qualityScore);
      
      return {
        success: true,
        cnlText: validateDto.cnlText,
        qualityScore: qualityScore,
        recommendations: recommendations,
        nlpAnalysis: nlpAnalysis
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
