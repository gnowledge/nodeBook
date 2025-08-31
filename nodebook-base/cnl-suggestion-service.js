// Using built-in fetch (available in Node.js 18+)

class CNLSuggestionService {
    constructor() {
        this.wordnetServiceUrl = process.env.WORDNET_SERVICE_URL || 'http://localhost:3003';
        this.nlpServiceUrl = process.env.NLP_SERVICE_URL || 'http://localhost:3002';
    }

    /**
     * Generate CNL suggestions from natural language input
     * @param {string} naturalText - Natural language input
     * @returns {Object} CNL suggestions with explanations
     */
    async generateSuggestions(naturalText) {
        try {
            console.log(`[CNL Suggestion] Processing: "${naturalText}"`);

            // Step 1: WordNet Analysis
            const wordnetAnalysis = await this.analyzeWithWordNet(naturalText);
            console.log(`[CNL Suggestion] WordNet analysis:`, wordnetAnalysis);

            // Step 2: NLP Enhancement
            const nlpAnalysis = await this.analyzeWithNLP(naturalText);
            console.log(`[CNL Suggestion] NLP analysis:`, nlpAnalysis);

            // Step 3: Generate CNL Suggestions
            const suggestions = this.generateCNLSuggestions(wordnetAnalysis, nlpAnalysis);

            // Step 4: Quality Scoring
            const qualityScore = this.assessQuality(suggestions, nlpAnalysis);

            return {
                success: true,
                originalText: naturalText,
                suggestions: suggestions,
                qualityScore: qualityScore,
                wordnetAnalysis: wordnetAnalysis,
                nlpAnalysis: nlpAnalysis,
                recommendations: this.generateRecommendations(suggestions, qualityScore)
            };

        } catch (error) {
            console.error(`[CNL Suggestion] Error:`, error);
            return {
                success: false,
                error: error.message,
                fallbackSuggestion: this.generateFallbackSuggestion(naturalText)
            };
        }
    }

    /**
     * Analyze text using WordNet service
     * @param {string} text - Text to analyze
     * @returns {Object} WordNet analysis results
     */
    async analyzeWithWordNet(text) {
        try {
            // Extract key terms for WordNet lookup
            const terms = this.extractKeyTerms(text);
            const wordnetResults = {};

            for (const term of terms) {
                const response = await fetch(`${this.wordnetServiceUrl}/api/wordnet/lookup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word: term })
                });

                if (response.ok) {
                    const result = await response.json();
                    wordnetResults[term] = result;
                } else {
                    wordnetResults[term] = { found: false, message: 'WordNet lookup failed' };
                }
            }

            return wordnetResults;

        } catch (error) {
            console.error(`[CNL Suggestion] WordNet error:`, error);
            return { error: 'WordNet service unavailable' };
        }
    }

    /**
     * Analyze text using NLP service
     * @param {string} text - Text to analyze
     * @returns {Object} NLP analysis results
     */
    async analyzeWithNLP(text) {
        try {
            const response = await fetch(`${this.nlpServiceUrl}/api/nlp/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`NLP service error: ${response.status}`);
            }

        } catch (error) {
            console.error(`[CNL Suggestion] NLP error:`, error);
            return { error: 'NLP service unavailable' };
        }
    }

    /**
     * Extract key terms from text for WordNet lookup
     * @param {string} text - Text to process
     * @returns {Array} Array of key terms
     */
    extractKeyTerms(text) {
        // Simple extraction - can be enhanced with NLP
        const words = text.toLowerCase().split(/\s+/);
        const stopWords = new Set(['is', 'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'has', 'have', 'had']);
        
        return words
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 5); // Limit to top 5 terms
    }

    /**
     * Generate CNL suggestions from analysis results
     * @param {Object} wordnetAnalysis - WordNet analysis results
     * @param {Object} nlpAnalysis - NLP analysis results
     * @returns {Array} Array of CNL suggestions
     */
    generateCNLSuggestions(wordnetAnalysis, nlpAnalysis) {
        const suggestions = [];

        // Generate node suggestions
        if (nlpAnalysis.analysis && nlpAnalysis.analysis.nouns) {
            nlpAnalysis.analysis.nouns.forEach(noun => {
                const suggestion = this.generateNodeSuggestion(noun, wordnetAnalysis, nlpAnalysis);
                if (suggestion) suggestions.push(suggestion);
            });
        }

        // Generate relation suggestions
        if (nlpAnalysis.analysis && nlpAnalysis.analysis.verbs) {
            nlpAnalysis.analysis.verbs.forEach(verb => {
                const suggestion = this.generateRelationSuggestion(verb, nlpAnalysis);
                if (suggestion) suggestions.push(suggestion);
            });
        }

        // Generate attribute suggestions
        if (nlpAnalysis.analysis && nlpAnalysis.analysis.processes) {
            nlpAnalysis.analysis.processes.forEach(process => {
                const suggestion = this.generateAttributeSuggestion(process, nlpAnalysis);
                if (suggestion) suggestions.push(suggestion);
            });
        }

        return suggestions;
    }

    /**
     * Generate node suggestion from noun analysis
     * @param {string} noun - Noun to process
     * @param {Object} wordnetAnalysis - WordNet analysis
     * @param {Object} nlpAnalysis - NLP analysis
     * @returns {Object} Node suggestion
     */
    generateNodeSuggestion(noun, wordnetAnalysis, nlpAnalysis) {
        const cleanNoun = noun.replace(/[^\w\s]/g, '').trim();
        if (!cleanNoun) return null;

        // Determine node type based on NLP analysis
        let nodeType = 'individual';
        if (nlpAnalysis.analysis && nlpAnalysis.analysis.places && nlpAnalysis.analysis.places.includes(cleanNoun)) {
            nodeType = 'Place';
        } else if (nlpAnalysis.analysis && nlpAnalysis.analysis.people && nlpAnalysis.analysis.people.includes(cleanNoun)) {
            nodeType = 'Person';
        } else if (nlpAnalysis.analysis && nlpAnalysis.analysis.organizations && nlpAnalysis.analysis.organizations.includes(cleanNoun)) {
            nodeType = 'Organization';
        }

        // Get WordNet description if available
        let description = null;
        if (wordnetAnalysis[cleanNoun.toLowerCase()] && wordnetAnalysis[cleanNoun.toLowerCase()].found) {
            const wordnetData = wordnetAnalysis[cleanNoun.toLowerCase()];
            if (wordnetData.definition) {
                description = wordnetData.definition;
            }
        }

        return {
            type: 'node',
            original: noun,
            suggestion: `# ${cleanNoun} [${nodeType}]`,
            description: description ? `\`\`\`description\n${description}\n\`\`\`` : null,
            confidence: 0.8,
            reasoning: `Identified as ${nodeType.toLowerCase()} based on NLP analysis`
        };
    }

    /**
     * Generate relation suggestion from verb analysis
     * @param {string} verb - Verb to process
     * @param {Object} nlpAnalysis - NLP analysis
     * @returns {Object} Relation suggestion
     */
    generateRelationSuggestion(verb, nlpAnalysis) {
        const cleanVerb = verb.replace(/[^\w\s]/g, '').trim();
        if (!cleanVerb) return null;

        return {
            type: 'relation',
            original: verb,
            suggestion: `<${cleanVerb}> Target;`,
            confidence: 0.7,
            reasoning: `Verb "${cleanVerb}" suggests a relationship between entities`
        };
    }

    /**
     * Generate attribute suggestion from process analysis
     * @param {Object} process - Process to analyze
     * @param {Object} nlpAnalysis - NLP analysis
     * @returns {Object} Attribute suggestion
     */
    generateAttributeSuggestion(process, nlpAnalysis) {
        if (process.keyword === 'has') {
            return {
                type: 'attribute',
                original: process.label,
                suggestion: `has attribute_name: value;`,
                confidence: 0.6,
                reasoning: `Process "${process.label}" suggests an attribute relationship`
            };
        }

        return null;
    }

    /**
     * Assess quality of CNL suggestions
     * @param {Array} suggestions - Generated suggestions
     * @param {Object} nlpAnalysis - NLP analysis
     * @returns {Object} Quality assessment
     */
    assessQuality(suggestions, nlpAnalysis) {
        let score = 0;
        const maxScore = 100;
        const feedback = [];

        // Score based on number of suggestions
        if (suggestions.length > 0) {
            score += Math.min(suggestions.length * 10, 30);
            feedback.push(`Generated ${suggestions.length} suggestions`);
        }

        // Score based on NLP confidence
        if (nlpAnalysis.analysis && nlpAnalysis.analysis.graphBuildingPotential) {
            switch (nlpAnalysis.analysis.graphBuildingPotential) {
                case 'excellent': score += 30; break;
                case 'good': score += 20; break;
                case 'fair': score += 10; break;
                case 'poor': score += 5; break;
            }
            feedback.push(`NLP graph building potential: ${nlpAnalysis.analysis.graphBuildingPotential}`);
        }

        // Score based on suggestion confidence
        const avgConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0) / Math.max(suggestions.length, 1);
        score += Math.round(avgConfidence * 20);
        feedback.push(`Average suggestion confidence: ${(avgConfidence * 100).toFixed(1)}%`);

        // Determine quality level
        let quality = 'poor';
        if (score >= 80) quality = 'excellent';
        else if (score >= 60) quality = 'good';
        else if (score >= 40) quality = 'fair';

        return {
            score: Math.min(score, maxScore),
            quality: quality,
            feedback: feedback,
            maxScore: maxScore
        };
    }

    /**
     * Generate recommendations for improvement
     * @param {Array} suggestions - Generated suggestions
     * @param {Object} qualityScore - Quality assessment
     * @returns {Array} Array of recommendations
     */
    generateRecommendations(suggestions, qualityScore) {
        const recommendations = [];

        if (qualityScore.score < 60) {
            recommendations.push("💡 Consider adding more specific entities and relationships");
            recommendations.push("💡 Use descriptive nouns instead of generic terms");
            recommendations.push("💡 Include attributes to make entities more informative");
        }

        if (suggestions.length < 3) {
            recommendations.push("💡 Add more descriptive elements to create richer graphs");
        }

        if (qualityScore.quality === 'excellent') {
            recommendations.push("🎉 Excellent CNL structure! Ready for graph generation");
        }

        return recommendations;
    }

    /**
     * Generate fallback suggestion when services fail
     * @param {string} text - Original text
     * @returns {Object} Fallback suggestion
     */
    generateFallbackSuggestion(text) {
        return {
            type: 'fallback',
            original: text,
            suggestion: `# ${text.split(' ')[0]} [Entity]\n<relates to> Other Entity;`,
            confidence: 0.3,
            reasoning: 'Basic fallback suggestion due to service unavailability'
        };
    }
}

export default CNLSuggestionService;
