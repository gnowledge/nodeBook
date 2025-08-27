from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import nltk
import os
import logging
import uvicorn
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Download WordNet data if not present
try:
    # Add the NLTK data directory to the search path
    nltk_data_dir = '/app/nltk_data'
    if os.path.exists(nltk_data_dir):
        nltk.data.path.insert(0, nltk_data_dir)
        logger.info(f"📁 Added {nltk_data_dir} to NLTK data path")
    
    # Try to find WordNet data (it should be available from the Docker build)
    nltk.data.find('corpora/wordnet')
    logger.info("📚 WordNet data found")
    WORDNET_AVAILABLE = True
except LookupError:
    logger.warning("⚠️ WordNet data not available, service will use fallback definitions")
    WORDNET_AVAILABLE = False

# Also download additional NLTK data for better term analysis (only if needed)
try:
    if not os.path.exists(os.path.join(nltk_data_dir, 'tokenizers', 'punkt')):
        nltk.download('punkt', download_dir=nltk_data_dir, quiet=True)
    if not os.path.exists(os.path.join(nltk_data_dir, 'taggers', 'averaged_perceptron_tagger')):
        nltk.download('averaged_perceptron_tagger', download_dir=nltk_data_dir, quiet=True)
    logger.info("📚 Additional NLTK data available")
except Exception as e:
    logger.warning(f"⚠️ Could not download additional NLTK data: {e}")

app = FastAPI(
    title="WordNet Service",
    description="Microservice for WordNet definitions and related terms using NLTK",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class WordNetDefinition(BaseModel):
    id: int
    text: str
    type: str
    confidence: float
    synset: Optional[str] = None
    examples: List[str] = []
    synonyms: List[str] = []

class WordNetResult(BaseModel):
    term: str
    definitions: List[WordNetDefinition]
    relatedTerms: List[str]
    wordNetInfo: dict

class BatchRequest(BaseModel):
    terms: List[str]

class RelatedTermsResult(BaseModel):
    term: str
    synonyms: List[str]
    antonyms: List[str]
    hypernyms: List[str]
    hyponyms: List[str]

def generate_intelligent_fallback(term: str) -> WordNetDefinition:
    """Generate a more intelligent fallback definition based on the term characteristics"""
    # Clean the term
    clean_term = re.sub(r'[^\w\s]', '', term).strip()
    
    # Try to determine if it's an acronym
    if clean_term.isupper() and len(clean_term) <= 5:
        return WordNetDefinition(
            id=1,
            text=f"{term} appears to be an acronym or abbreviation. Consider providing a specific definition based on your domain context.",
            type="abbreviation",
            confidence=0.3,
            source="fallback"
        )
    
    # Check if it's a compound word
    if ' ' in clean_term or '-' in clean_term:
        return WordNetDefinition(
            id=1,
            text=f"{term} appears to be a compound term or phrase. Consider breaking it down into simpler concepts or providing a domain-specific definition.",
            type="compound",
            confidence=0.3,
            source="fallback"
        )
    
    # Check if it looks like a proper noun
    if clean_term[0].isupper() and len(clean_term) > 3:
        return WordNetDefinition(
            id=1,
            text=f"{term} appears to be a proper noun or specific entity. Consider providing a definition based on your specific context or domain.",
            type="proper_noun",
            confidence=0.3,
            source="fallback"
        )
    
    # Generic fallback
    return WordNetDefinition(
        id=1,
        text=f"{term} is a term that wasn't found in WordNet. Consider providing a specific definition based on your domain knowledge or context.",
        type="unknown",
        confidence=0.1,
        source="fallback"
    )

def try_alternative_lookups(term: str) -> List[WordNetDefinition]:
    """Try alternative approaches to find definitions for terms not in WordNet"""
    definitions = []
    
    # Try with different case variations
    variations = [term.lower(), term.title(), term.upper()]
    
    for var in variations:
        if var != term:
            synsets = []
            if WORDNET_AVAILABLE:
                try:
                    synsets = nltk.corpus.wordnet.synsets(var)
                except Exception as e:
                    logger.warning(f"⚠️ Error accessing WordNet for '{var}': {e}")
            if synsets:
                for i, synset in enumerate(synsets[:2]):
                    definitions.append(WordNetDefinition(
                        id=len(definitions) + 1,
                        text=f"{synset.definition()} (found via '{var}')",
                        type="concept",
                        confidence=0.6 - (i * 0.1),
                        synset=str(synset.offset()),
                        source="wordnet_variant"
                    ))
                break
    
    # Try to find related terms that might help
    if not definitions and WORDNET_AVAILABLE:
        # Look for terms that contain our term as a substring
        try:
            all_synsets = list(nltk.corpus.wordnet.all_synsets())
            related_terms = []
            
            for synset in all_synsets[:1000]:  # Limit search to avoid performance issues
                for lemma in synset.lemmas():
                    if term.lower() in lemma.name().lower() and lemma.name().lower() != term.lower():
                        related_terms.append((lemma.name(), synset.definition()))
                        if len(related_terms) >= 3:
                            break
                if len(related_terms) >= 3:
                    break
            
            if related_terms:
                definitions.append(WordNetDefinition(
                    id=1,
                    text=f"While '{term}' wasn't found directly, related terms include: {', '.join([rt[0] for rt in related_terms[:3]])}. Consider if any of these relate to your concept.",
                    type="related",
                    confidence=0.4,
                    source="related_terms"
                ))
        except Exception as e:
            logger.warning(f"⚠️ Error searching for related terms: {e}")
    
    return definitions

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "WordNet Service (Python/NLTK)",
        "version": "1.0.0",
        "wordnet_data": "available" if nltk.data.find('corpora/wordnet') else "missing"
    }

@app.get("/api/wordnet/definitions/{term}")
async def get_definitions(term: str):
    """Get WordNet definitions for a single term"""
    try:
        logger.info(f"🔍 Looking up definitions for: {term}")
        
        # Get synsets for the term (only if WordNet is available)
        synsets = []
        if WORDNET_AVAILABLE:
            try:
                synsets = nltk.corpus.wordnet.synsets(term)
            except Exception as e:
                logger.warning(f"⚠️ Error accessing WordNet: {e}")
        
        if not synsets:
            logger.info(f"⚠️ No WordNet synsets found for '{term}', trying alternatives...")
            
            # Try alternative lookups first
            alt_definitions = try_alternative_lookups(term)
            
            if alt_definitions:
                logger.info(f"✅ Found {len(alt_definitions)} alternative definitions for '{term}'")
                return {
                    "success": True,
                    "data": [{
                        "term": term,
                        "definitions": alt_definitions,
                        "relatedTerms": [],
                        "wordNetInfo": {
                            "synsets": 0,
                            "hypernyms": 0,
                            "hyponyms": 0,
                            "note": "Definitions found via alternative methods"
                        }
                    }]
                }
            
            # If still no definitions, use intelligent fallback
            logger.info(f"⚠️ No definitions found for '{term}', using intelligent fallback")
            fallback_def = generate_intelligent_fallback(term)
            
            return {
                "success": True,
                "data": [{
                    "term": term,
                    "definitions": [fallback_def],
                    "relatedTerms": [],
                    "wordNetInfo": {
                        "synsets": 0,
                        "hypernyms": 0,
                        "hyponyms": 0,
                        "note": "No WordNet data available, using fallback"
                    }
                }]
            }
        
        # Process synsets
        definitions = []
        for i, synset in enumerate(synsets[:5]):  # Limit to 5 definitions
            # Get definition
            definition = synset.definition()
            
            # Get examples
            examples = synset.examples()
            
            # Get synonyms (lemmas)
            synonyms = [lemma.name() for lemma in synset.lemmas()]
            
            # Get part of speech
            pos = synset.pos()
            pos_map = {
                'n': 'noun',
                'v': 'verb', 
                'a': 'adjective',
                's': 'adjective',
                'r': 'adverb'
            }
            pos_name = pos_map.get(pos, 'concept')
            
            definitions.append(WordNetDefinition(
                id=i + 1,
                text=definition,
                type=pos_name,
                confidence=0.9 - (i * 0.1),
                                    synset=str(synset.offset()),
                    examples=examples,
                    synonyms=synonyms,
                    source="wordnet"
            ))
        
        # Get related terms from first synset
        related_terms = []
        if synsets:
            first_synset = synsets[0]
            related_terms = [lemma.name() for lemma in first_synset.lemmas()]
        
        result = WordNetResult(
            term=term,
            definitions=definitions,
            relatedTerms=related_terms,
            wordNetInfo={
                "synsets": len(synsets),
                "hypernyms": len(first_synset.hypernyms()) if synsets else 0,
                "hyponyms": len(first_synset.hyponyms()) if synsets else 0
            }
        )
        
        return {
            "success": True,
            "data": [result]
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting definitions for '{term}': {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get definitions: {str(e)}")

@app.post("/api/wordnet/definitions/batch")
async def get_batch_definitions(request: BatchRequest):
    """Get WordNet definitions for multiple terms"""
    try:
        logger.info(f"🔍 Batch lookup for {len(request.terms)} terms: {', '.join(request.terms)}")
        
        results = []
        for term in request.terms:
            # Get synsets for the term (only if WordNet is available)
            synsets = []
            if WORDNET_AVAILABLE:
                try:
                    synsets = nltk.corpus.wordnet.synsets(term)
                except Exception as e:
                    logger.warning(f"⚠️ Error accessing WordNet for '{term}': {e}")
            
            if not synsets:
                logger.info(f"⚠️ No WordNet synsets found for '{term}', trying alternatives...")
                
                # Try alternative lookups first
                alt_definitions = try_alternative_lookups(term)
                
                if alt_definitions:
                    logger.info(f"✅ Found {len(alt_definitions)} alternative definitions for '{term}'")
                    results.append({
                        "term": term,
                        "definitions": alt_definitions,
                        "relatedTerms": [],
                        "wordNetInfo": {
                            "synsets": 0,
                            "hypernyms": 0,
                            "hyponyms": 0,
                            "note": "Definitions found via alternative methods"
                        }
                    })
                    continue
                
                # If still no definitions, use intelligent fallback
                logger.info(f"⚠️ No definitions found for '{term}', using intelligent fallback")
                fallback_def = generate_intelligent_fallback(term)
                
                results.append({
                    "term": term,
                    "definitions": [fallback_def],
                    "relatedTerms": [],
                    "wordNetInfo": {
                        "synsets": 0,
                        "hypernyms": 0,
                        "hyponyms": 0,
                        "note": "No WordNet data available, using fallback"
                    }
                })
                continue
            
            # Process synsets
            definitions = []
            for i, synset in enumerate(synsets[:3]):  # Limit to 3 definitions per term
                # Get definition
                definition = synset.definition()
                
                # Get examples
                examples = synset.examples()
                
                # Get synonyms (lemmas)
                synonyms = [lemma.name() for lemma in synset.lemmas()]
                
                # Get part of speech
                pos = synset.pos()
                pos_map = {
                    'n': 'noun',
                    'v': 'verb', 
                    'a': 'adjective',
                    's': 'adjective',
                    'r': 'adverb'
                }
                pos_name = pos_map.get(pos, 'concept')
                
                definitions.append({
                    "id": i + 1,
                    "text": definition,
                    "type": pos_name,
                    "confidence": 0.9 - (i * 0.1),
                    "synset": str(synset.offset()),
                    "examples": examples,
                    "synonyms": synonyms
                })
            
            # Get related terms from first synset
            related_terms = []
            if synsets:
                first_synset = synsets[0]
                related_terms = [lemma.name() for lemma in first_synset.lemmas()]
            
            results.append({
                "term": term,
                "definitions": definitions,
                "relatedTerms": related_terms,
                "wordNetInfo": {
                    "synsets": len(synsets),
                    "hypernyms": len(first_synset.hypernyms()) if synsets else 0,
                    "hyponyms": len(first_synset.hyponyms()) if synsets else 0
                }
            })
        
        return {
            "success": True,
            "data": results
        }
        
    except Exception as e:
        logger.error(f"❌ Error in batch lookup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process batch lookup: {str(e)}")

@app.get("/api/wordnet/related/{term}")
async def get_related_terms(term: str):
    """Get related terms (synonyms, antonyms, hypernyms, hyponyms)"""
    try:
        logger.info(f"🔗 Looking up related terms for: {term}")
        
        # Get synsets for the term (only if WordNet is available)
        synsets = []
        if WORDNET_AVAILABLE:
            try:
                synsets = nltk.corpus.wordnet.synsets(term)
            except Exception as e:
                logger.warning(f"⚠️ Error accessing WordNet: {e}")
        
        if not synsets:
            return {
                "success": True,
                "data": RelatedTermsResult(
                    term=term,
                    synonyms=[],
                    antonyms=[],
                    hypernyms=[],
                    hyponyms=[]
                )
            }
        
        # Use the first synset
        synset = synsets[0]
        
        # Get synonyms
        synonyms = [lemma.name() for lemma in synset.lemmas()]
        
        # Get antonyms
        antonyms = []
        for lemma in synset.lemmas():
            antonyms.extend([ant.name() for ant in lemma.antonyms()])
        
        # Get hypernyms (more general terms)
        hypernyms = []
        for hypernym in synset.hypernyms():
            hypernyms.extend([lemma.name() for lemma in hypernym.lemmas()])
        
        # Get hyponyms (more specific terms)
        hyponyms = []
        for hyponym in synset.hyponyms():
            hyponyms.extend([lemma.name() for lemma in hyponym.lemmas()])
        
        result = RelatedTermsResult(
            term=term,
            synonyms=list(set(synonyms)),  # Remove duplicates
            antonyms=list(set(antonyms)),
            hypernyms=list(set(hypernyms)),
            hyponyms=list(set(hyponyms))
        )
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting related terms for '{term}': {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get related terms: {str(e)}")

if __name__ == "__main__":
    logger.info("🚀 Starting WordNet Service (Python/NLTK)")
    logger.info("📚 Capabilities: WordNet definitions and relations")
    logger.info("🔗 Health check: http://localhost:3003/health")
    logger.info("📖 Definitions: http://localhost:3003/api/wordnet/definitions/:term")
    logger.info("🔄 Batch lookup: http://localhost:3003/api/wordnet/definitions/batch")
    logger.info("🔗 Related terms: http://localhost:3003/api/wordnet/related/:term")
    
    uvicorn.run(app, host="0.0.0.0", port=3003)
