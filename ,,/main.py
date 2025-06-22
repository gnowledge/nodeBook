from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from llama_cpp import Llama
from fastapi.responses import JSONResponse

app = FastAPI()

# Load the Mistral model
llm = Llama(
    model_path="./mistral-7b-instruct-v0.2.Q6_K.gguf",
    n_ctx=2048,  # Context length
    n_threads=4,  # Adjust based on your CPU
    n_gpu_layers=0  # Set to >0 if you have a compatible GPU
)

# Define input model for the API
class TextInput(BaseModel):
    text: str
    max_length: int = 100  # Default summary length

# Summarization function
def summarize_text(text: str, max_length: int) -> str:
    prompt = f"""<s>[INST] Summarize the following text in approximately {max_length} words. Keep the summary concise and capture the main points:

{text}

Summary: [/INST]"""
    
    response = llm(
        prompt,
        max_tokens=max_length * 2,  # Rough estimate for word count
        stop=["</s>"],
        echo=False
    )
    
    summary = response["choices"][0]["text"].strip()
    return summary

@app.post("/summarize")
async def summarize(input: TextInput):
    try:
        summary = summarize_text(input.text, input.max_length)
        return JSONResponse(content={"summary": summary})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Mistral-7B Summarization API. Use POST /summarize with {'text': 'your text', 'max_length': 100}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
